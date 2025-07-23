import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { SignupDto } from 'src/auth/dto';
import { BaseService } from 'src/base.service';

@Injectable()
export class UserService extends BaseService<UserDocument> {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  async create(dto: SignupDto): Promise<User> {
    const user = new this.userModel(dto);
    return user.save();
  }

  async findByEmail(
    email: string,
    includePassword: boolean = false,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email });
    if (includePassword) query.select('+password');
    return query.exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async getAllUsers(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async getUserById(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }
}
