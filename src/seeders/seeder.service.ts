import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { pinoLogger } from 'src/middlewares/logger/pino-logger';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { userSeedData } from './data/user.data';

@Injectable()
export class SeederService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // User seeding methods
  async seedUsers(): Promise<void> {
    try {
      for (const userData of userSeedData) {
        const existingUser = await this.userModel.findOne({
          email: userData.email,
        });
        if (existingUser) {
          pinoLogger.info(
            `User with email ${userData.email} already exists, skipping`,
          );
          continue;
        }

        const newUser = new this.userModel(userData);
        await newUser.save();
        pinoLogger.info(`User with email ${userData.email} seeded`);
      }

      pinoLogger.info(`User seeding complete`);
    } catch (error) {
      pinoLogger.error('Error seeding users:', error);
      throw error;
    }
  }

  // Clear methods
  async clearUsers(): Promise<void> {
    try {
      await this.userModel.deleteMany({});
      pinoLogger.info('Successfully cleared all users');
    } catch (error) {
      pinoLogger.error('Error clearing users:', error);
      throw error;
    }
  }

  // Main seeding methods
  async seedAll(): Promise<void> {
    pinoLogger.info('Starting database seeding...');

    try {
      await this.seedUsers();

      pinoLogger.info('Database seeding completed successfully');
    } catch (error) {
      pinoLogger.error('Database seeding failed:', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    pinoLogger.info('Starting database clearing...');

    try {
      await this.clearUsers();

      pinoLogger.info('Database clearing completed successfully');
    } catch (error) {
      pinoLogger.error('Database clearing failed:', error);
      throw error;
    }
  }
}
