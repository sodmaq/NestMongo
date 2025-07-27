import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UserService } from 'src/user/user.service';
import { LoginDto, RefreshTokenDto, SignupDto } from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { access } from 'fs';
import { MailService } from 'src/mail/mail.service';
import { UserDocument } from 'src/user/schema/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
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
    })) as UserDocument;

    console.log('this is signup user', user);

    //create verification token
    const verificationToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_VERIFICATION_SECRET,
        expiresIn: process.env.JWT_VERIFICATION_EXPIRATION_TIME,
      },
    );
    console.log('this is verification token', verificationToken);

    const verificationLink = `${process.env.CLIENT_URL}/verify/${verificationToken}`;

    //send welcome email
    await this.mailService.sendWelcomeEmail(
      user.email,
      user.fullName,
      verificationLink,
    );

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email, true);
    if (!user) throw new ForbiddenException('There is no user with this email');

    const valid = await argon.verify(user.password, dto.password);
    if (!valid) throw new ForbiddenException('Invalid password');

    if (!user.isVerified)
      throw new ForbiddenException(
        'Please verify your email before logging in',
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

  async forgotPassword() {}
}
