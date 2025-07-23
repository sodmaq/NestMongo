import {
  Controller,
  Get,
  Param,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserDocument } from './schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtGuard } from 'src/auth/guards';
import { GetUser } from './decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/enums/roles.enum';
import { Roles } from './decorator/roles.decorator';
import { AllExceptionsFilter } from 'src/filters/all-exceptions.filter';

@Controller('user')
@UseFilters(new AllExceptionsFilter())
export class UserController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly userService: UserService,
  ) {}

  @Get('getAllUsers')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }

  @Get('getAllPaginatedUsers')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllPaginatedUsers(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<{
    result: User[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    return this.userService.getAllPaginated({}, +page, +limit);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async getMe(@GetUser() user: UserDocument): Promise<User> {
    return this.userService.getUserById(user.id);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  async getUserById(@Param('id') id: string): Promise<User> {
    return this.userService.getUserById(id);
  }
}
