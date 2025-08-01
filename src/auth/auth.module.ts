import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/mail/mail.module';
import { RedisModule } from 'src/redis/redis.module';
import { RedisService } from 'src/redis/redis.service';

@Module({
  imports: [UserModule, JwtModule.register({}), MailModule, RedisModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RedisModule, RedisService],
})
export class AuthModule {}
