import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserDocument } from './schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtGuard } from 'src/auth/guards';

@Controller('user')
export class UserController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly userService: UserService,
  ) {}

  @Get('getAllUsers')
  @UseGuards(JwtGuard)
  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }

  @Get('getUserById/:id')
  @UseGuards(JwtGuard)
  async getUserById(@Param('id') id: string): Promise<User> {
    return this.userService.getUserById(id);
  }
}
