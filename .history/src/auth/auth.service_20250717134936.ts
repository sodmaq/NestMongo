import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UserService } from 'src/user/user.service';
import { LoginDto, SignupDto } from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
  ) {}

  async signUp(dto: SignupDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const hash = await argon.hash(dto.password);

    const user = await this.userService.create({ ...dto, password: hash });
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new ForbiddenException('User not found');

    const valid = await argon.verify(user.password, dto.password);
    if (!valid) throw new ForbiddenException('Invalid password');

    const tokens = await this.signTokens(user.id, user.email);

    return { ...tokens };
  }

  async signTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string }> {
    const payload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_SECRET,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_SECRET,
    });
    return { accessToken };
  }
}
