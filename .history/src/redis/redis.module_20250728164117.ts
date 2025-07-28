import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (configService: ConfigService) => {
        console.log('🔄 Connecting to Redis Cloud...');

        const client = createClient({
          username: configService.get('REDIS_USERNAME'),
          password: configService.get('REDIS_PASSWORD'),
          socket: {
            host: configService.get('REDIS_HOST'),
            port: parseInt(configService.get('REDIS_PORT')),
            // Redis Cloud automatically handles TLS
            tls: true,
            connectTimeout: 20000,
            commandTimeout: 10000,
          },
          // Retry strategy
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              return new Error('The server refused the connection');
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
              return new Error('Retry time exhausted');
            }
            if (options.attempt > 10) {
              return undefined;
            }
            return Math.min(options.attempt * 100, 3000);
          },
        });

        // Connection event handlers
        client.on('connect', () => {
          console.log('🔄 Redis client initiated connection...');
        });

        client.on('ready', () => {
          console.log('✅ Redis Cloud connected and ready!');
        });

        client.on('error', (err) => {
          console.error('❌ Redis connection error:', err);
        });

        client.on('end', () => {
          console.log('🔌 Redis connection ended');
        });

        client.on('reconnecting', () => {
          console.log('🔄 Redis reconnecting...');
        });

        // Connect to Redis
        try {
          await client.connect();
          console.log('🚀 Redis connection established successfully!');
        } catch (error) {
          console.error('❌ Failed to connect to Redis:', error);
          throw error;
        }

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
