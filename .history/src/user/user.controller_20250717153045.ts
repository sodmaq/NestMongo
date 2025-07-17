import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';

@Controller('user')
export class UserController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly userService: UserService,
  ) {}

  @Get('')
  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }
}
