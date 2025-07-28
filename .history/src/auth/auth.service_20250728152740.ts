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
import { pinoLogger } from 'src/middlewares/logger/pino-logger';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
  ) {}

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

  async onModuleInit() {
    const isConnected = await this.redisService.testConnection();
    if (!isConnected) {
      pinoLogger.error('❌ Failed to connect to Redis Cloud!');
    }
  }

  // STEP 1: Request OTP
  async forgotPassword(dto: EmailDto): Promise<{ message: string }> {
    try {
      // Check if user exists (replace with your user service)
      // const user = await this.userService.findByEmail(dto.email);
      const user = { email: dto.email, fullName: 'Test User' }; // Mock for now

      const successMessage = {
        message: 'If that email exists, an OTP has been sent to your email',
      };

      if (!user) {
        return successMessage;
      }

      // Check rate limiting
      await this.checkRateLimit(dto.email);

      // Generate 6-digit OTP
      const otp = this.generateSecureOtp();
      const hashedOtp = await this.hashOtp(otp);

      // Redis keys
      const otpKey = `otp:${dto.email}`;
      const rateLimitKey = `rate_limit:${dto.email}`;

      // Store OTP in Redis (10 minutes expiry)
      const otpData = {
        hashedOtp,
        attempts: 0,
        isVerified: false,
        createdAt: new Date().toISOString(),
        email: dto.email,
      };

      await this.redisService.setWithExpiry(otpKey, otpData, 600); // 10 minutes
      await this.redisService.setWithExpiry(
        rateLimitKey,
        { lastRequest: new Date() },
        120,
      ); // 2 minutes

      // Send OTP (replace with your mail service)
      console.log(`📧 OTP for ${dto.email}: ${otp}`); // Remove this in production!
      // await this.mailService.sendPasswordResetOtp(user.email, user.fullName, otp);

      pinoLogger.info(`Password reset OTP sent to ${dto.email}`);
      return successMessage;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      pinoLogger.error('Forgot password error:', error);
      throw new InternalServerErrorException(
        'Unable to process password reset request',
      );
    }
  }

  // STEP 2: Verify OTP
  async verifyPasswordResetOtp(
    dto: VerifyOtpDto,
  ): Promise<{ message: string; canResetPassword: boolean }> {
    try {
      const otpKey = `otp:${dto.email}`;
      const otpData = await this.redisService.get(otpKey);

      if (!otpData) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      // Check attempts
      if (otpData.attempts >= 3) {
        await this.redisService.delete(otpKey);
        throw new BadRequestException(
          'Too many failed attempts. Please request a new OTP',
        );
      }

      // Verify OTP
      const isValidOtp = await this.verifyOtp(dto.otp, otpData.hashedOtp);

      if (!isValidOtp) {
        // Increment attempts
        otpData.attempts += 1;
        const remainingTTL = await this.redisService.getTTL(otpKey);
        await this.redisService.setWithExpiry(
          otpKey,
          otpData,
          Math.max(remainingTTL, 60),
        );

        throw new BadRequestException(
          `Invalid OTP. ${3 - otpData.attempts} attempts remaining`,
        );
      }

      // Mark as verified
      otpData.isVerified = true;
      const remainingTTL = await this.redisService.getTTL(otpKey);
      await this.redisService.setWithExpiry(
        otpKey,
        otpData,
        Math.max(remainingTTL, 60),
      );

      return {
        message: 'OTP verified successfully',
        canResetPassword: true,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      pinoLogger.error('OTP verification error:', error);
      throw new InternalServerErrorException('Unable to verify OTP');
    }
  }

  // STEP 3: Reset Password
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      const otpKey = `otp:${dto.email}`;
      const otpData = await this.redisService.get(otpKey);

      if (!otpData || !otpData.isVerified) {
        throw new BadRequestException('Invalid or unverified OTP');
      }

      // Verify OTP again
      const isValidOtp = await this.verifyOtp(dto.otp, otpData.hashedOtp);
      if (!isValidOtp) {
        throw new BadRequestException('Invalid OTP');
      }

      // Update password (replace with your user service)
      // const user = await this.userService.findByEmail(dto.email);
      // const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
      // await this.userService.updatePassword(user.id, hashedPassword);

      console.log(`🔐 Password updated for ${dto.email}`); // Mock for now

      // Clean up OTP
      await this.redisService.delete(otpKey);

      pinoLogger.info(`Password reset completed for ${dto.email}`);
      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      pinoLogger.error('Password reset error:', error);
      throw new InternalServerErrorException('Unable to reset password');
    }
  }
}
