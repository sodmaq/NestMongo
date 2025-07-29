import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UserService } from 'src/user/user.service';
import {
  EmailDto,
  LoginDto,
  RefreshTokenDto,
  resendVerificationEmailDto,
  ResetPasswordDto,
  SignupDto,
  TokenDto,
  VerifyOtpDto,
} from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/mail/mail.service';
import { UserDocument } from 'src/user/schema/user.schema';
import { RedisService } from 'src/redis/redis.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
    private readonly redis: RedisService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Hash OTP
  private async hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10);
  }

  // Verify OTP
  private async verifyOtp(
    plainOtp: string,
    hashedOtp: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainOtp, hashedOtp);
  }

  async signUp(dto: SignupDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const hash = await argon.hash(dto.password);

    const user = (await this.userService.create({
      ...dto,
      password: hash,
      verificationSentAt: new Date(),
    })) as UserDocument;

    await this.verificationToken(user);

    return {
      message: 'Verification email sent',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
    };
  }

  async verifyEmail(dto: TokenDto) {
    let payload: { sub: string };

    try {
      payload = await this.jwt.verifyAsync(dto.token, {
        secret: process.env.JWT_VERIFICATION_SECRET,
      });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new ConflictException('User already verified');
    }

    user.isVerified = true;
    await user.save();

    return {
      message: 'Email successfully verified',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
      },
    };
  }

  async resendVerificationEmail(dto: resendVerificationEmailDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new ConflictException('User already verified');
    }

    await this.verificationToken(user);

    return { message: 'Verification email sent' };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email, true);
    if (!user) throw new ForbiddenException('There is no user with this email');

    const valid = await argon.verify(user.password, dto.password);
    if (!valid) throw new ForbiddenException('Invalid password');

    if (!user.isVerified)
      throw new ForbiddenException(
        'Please verify your email to login. Check your inbox.',
      );

    const tokens = await this.signTokens(user.id, user.email);

    return { ...tokens };
  }

  async signTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: process.env.JWT_EXPIRATION_TIME,
      secret: process.env.JWT_SECRET,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
      secret: process.env.JWT_REFRESH_SECRET,
    });
    return { accessToken, refreshToken };
  }

  async handleRefreshToken(dto: RefreshTokenDto) {
    const payload = await this.jwt.verifyAsync(dto.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
    if (!payload) throw new ForbiddenException('Invalid refresh token');
    const user = await this.userService.findById(payload.sub);
    if (!user) throw new NotFoundException('User not found');
    const tokens = await this.signTokens(user.id, user.email);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async verificationToken(user: UserDocument) {
    const verificationToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_VERIFICATION_SECRET,
        expiresIn: process.env.JWT_VERIFICATION_EXPIRATION_TIME,
      },
    );

    const verificationLink = `${process.env.CLIENT_URL}/auth/verify/${verificationToken}`;

    await this.mailService.sendWelcomeEmail(
      user.email,
      user.fullName,
      verificationLink,
    );
    return { message: 'Verification email sent' };
  }

  async forgotPassword(dto: EmailDto) {
    try {
      // 1. Check if user exists
      const user = await this.userService.findByEmail(dto.email);
      if (!user) {
        throw new NotFoundException('User with this email does not exist');
      }

      // 2. Check rate limit
      const rateLimitKey = `rate:${dto.email}`;
      const rateLimitExists = await this.redis.exists(rateLimitKey);

      if (rateLimitExists) {
        const remaining = await this.redis.ttl(rateLimitKey);
        throw new BadRequestException(
          `Wait ${remaining} seconds before requesting again`,
        );
      }

      // 3. Generate OTP
      const otp = this.generateOtp();
      const hashedOtp = await this.hashOtp(otp);

      // 4. Store OTP data in Redis
      const otpKey = `otp:${dto.email}`;
      const otpData = JSON.stringify({
        hashedOtp,
        attempts: 0,
        verified: false,
        created: new Date().toISOString(),
      });

      const expirationInSeconds = 600;
      const expirationInMinutes = Math.floor(expirationInSeconds / 60);

      await this.redis.setEx(otpKey, expirationInSeconds, otpData);
      await this.redis.setEx(rateLimitKey, 120, 'blocked');

      // 5. Send OTP via email
      await this.mailService.sendOtpEmail(
        dto.email,
        otp,
        expirationInMinutes,
        user.fullName,
      );

      return { message: 'OTP sent to your email' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to send OTP');
    }
  }

  async verifyOtps(dto: VerifyOtpDto) {
    try {
      const keys = await this.redis.keys('otp:*');
      let matchedKey: string | undefined;
      let otpDataStr: string | null = null;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (!data) continue;

        const parsed = JSON.parse(data);
        const isValid = await this.verifyOtp(dto.otp, parsed.hashedOtp);

        if (isValid) {
          matchedKey = key;
          otpDataStr = data;
          break;
        }
      }

      if (!otpDataStr || !matchedKey) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      const otpData = JSON.parse(otpDataStr);

      if (otpData.attempts >= 3) {
        await this.redis.del(matchedKey);
        throw new BadRequestException('Too many attempts. Request new OTP');
      }

      otpData.verified = true;
      const ttl = await this.redis.ttl(matchedKey);
      await this.redis.setEx(matchedKey, ttl, JSON.stringify(otpData));

      // Generate reset token and store email
      const email = matchedKey.split(':')[1];
      const resetToken = randomUUID();
      await this.redis.setEx(`resetToken:${resetToken}`, 600, email); // 10 mins

      return { message: 'OTP verified successfully', resetToken };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to verify OTP');
    }
  }

  async resetPassword(dto: ResetPasswordDto, token: string) {
    try {
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      const email = await this.redis.get(`resetToken:${token}`);
      if (!email) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      user.password = await argon.hash(dto.password);
      await user.save();
      await this.mailService.sendNotification(
        email,
        'Password Reset',
        'your password has been reset successfully',
      );

      await this.redis.del(`resetToken:${token}`);

      return { message: 'Password reset successfully' };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Failed to reset password');
    }
  }

  async getDebugInfo() {
    const keys = await this.redis.keys('*');
    const data = {};

    for (const key of keys) {
      const value = await this.redis.get(key);
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }

    return { keys: keys.length, data };
  }
}
