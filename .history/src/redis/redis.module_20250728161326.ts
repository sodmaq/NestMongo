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
          port: configService.get('REDIS_PORT'),
          username: configService.get('REDIS_USERNAME'), // Important for Redis Cloud
          password: configService.get('REDIS_PASSWORD'),

          // Connection settings for Redis Cloud
          connectTimeout: 10000,
          lazyConnect: true,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,

          // TLS settings (Redis Cloud often requires this)
          tls: {
            servername: configService.get('REDIS_HOST'), // Use the hostname for TLS
          },
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
