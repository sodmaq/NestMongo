import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserDocument } from './schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Controller('user')
export class UserController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly userService: UserService,
  ) {}

  @Get('getAllUsers')
  @UseGuards(J)
  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }
}
