import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UserService } from 'src/user/user.service';
import { LoginDto, SignupDto } from './dto';
import * as argon from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userService: UserService,
  ) {}

  async signUp(dto: SignupDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new Error('Email already in use');
    }
    const hash = await argon.hash(dto.password);
    try {
      const user = await this.userService.create({ ...dto, password: hash });
      return user;
    } catch (error) {
      throw error;
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.userService.findByEmail(dto.email);
      if (!user) {
        throw new ForbiddenException('User not found');
      }
      const valid = await argon.verify(user.password, dto.password);
      if (!valid) {
        throw new ForbiddenException('Invalid password');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }
}
