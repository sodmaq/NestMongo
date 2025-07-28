import { Injectable, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: any) {}

  // Set with expiration
  async setEx(key: string, seconds: number, value: string): Promise<void> {
    await this.redis.setEx(key, seconds, value);
  }

  // Get value
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  // Delete key
  async del(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  // Check if exists
  async exists(key: string): Promise<number> {
    return await this.redis.exists(key);
  }

  // Get TTL
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  // Increment
  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  // Set expiration
  async expire(key: string, seconds: number): Promise<number> {
    return await this.redis.expire(key, seconds);
  }

  // Get all keys
  async keys(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }
}
