import { Injectable } from '@nestjs/common';
import { Sign } from 'crypto';
import { DatabaseService } from 'src/database/database.service';
import { UserService } from 'src/user/user.service';
import { SignupDto } from './dto';

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

    return this.userService.create(dto);
  }
}
