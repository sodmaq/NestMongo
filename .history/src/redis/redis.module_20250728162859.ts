// redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        console.log('🔄 Connecting to Redis Cloud...');

        const redis = new Redis({
          host: configService.get('REDIS_HOST'),
          port: parseInt(configService.get('REDIS_PORT')),
          username: configService.get('REDIS_USERNAME'),
          password: configService.get('REDIS_PASSWORD'),
          connectTimeout: 20000,
          commandTimeout: 5000,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          lazyConnect: false,
          family: 4,
        });

        // Connection event handlers
        redis.on('connect', () => {
          console.log('✅ Connected to Redis Cloud successfully!');
        });

        redis.on('error', (err) => {
          console.error('❌ Redis connection error:', err);
        });

        redis.on('ready', () => {
          console.log('🚀 Redis is ready to accept commands');
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
