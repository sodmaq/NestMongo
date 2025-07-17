import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { SignupDto } from 'src/auth/dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: SignupDto): Promise<User> {
    const user = new this.userModel(dto);
    return user.save();
  }

  async findByEmail(
    email: string,
    includePassword?: boolean = false,
  ): Promise<UserDocument | null> {
    const query = includePassword
      ? { email }
      : { email, password: { $exists: true } };
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async getAllUsers(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}
