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
      // Check rate limit
      const rateLimitKey = `rate:${dto.email}`;
      const rateLimitExists = await this.redis.exists(rateLimitKey);

      if (rateLimitExists) {
        const remaining = await this.redis.ttl(rateLimitKey);
        throw new BadRequestException(
          `Wait ${remaining} seconds before requesting again`,
        );
      }

      // Generate OTP
      const otp = this.generateOtp();
      const hashedOtp = await this.hashOtp(otp);

      // Store in Redis
      const otpKey = `otp:${dto.email}`;
      const otpData = JSON.stringify({
        hashedOtp,
        attempts: 0,
        verified: false,
        created: new Date().toISOString(),
      });

      await this.redis.setEx(otpKey, 600, otpData); // 10 minutes
      await this.redis.setEx(rateLimitKey, 120, 'blocked'); // 2 minutes

      // Log OTP for testing (REMOVE IN PRODUCTION)
      console.log(`📧 OTP for ${dto.email}: ${otp}`);

      return { message: 'OTP sent to your email' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to send OTP');
    }
  }
}
