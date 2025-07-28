import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // Test connection (call this first!)
  async testConnection(): Promise<boolean> {
    try {
      await this.redis.ping();
      this.logger.log('✅ Redis connection test successful');
      return true;
    } catch (error) {
      this.logger.error('❌ Redis connection test failed:', error);
      return false;
    }
  }

  // Set data with expiration (TTL = Time To Live in seconds)
  async setWithExpiry(
    key: string,
    value: any,
    expiryInSeconds: number,
  ): Promise<void> {
    try {
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      await this.redis.setex(key, expiryInSeconds, stringValue);
      this.logger.debug(`✅ Set key: ${key} with expiry: ${expiryInSeconds}s`);
    } catch (error) {
      this.logger.error(`❌ Error setting key ${key}:`, error);
      throw error;
    }
  }

  // Get data
  async get(key: string): Promise<any> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      this.logger.error(`❌ Error getting key ${key}:`, error);
      throw error;
    }
  }

  // Delete data
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      this.logger.debug(`🗑️ Deleted key: ${key}`);
      return result > 0;
    } catch (error) {
      this.logger.error(`❌ Error deleting key ${key}:`, error);
      throw error;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`❌ Error checking existence of key ${key}:`, error);
      throw error;
    }
  }

  // Get remaining time to live (TTL)
  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`❌ Error getting TTL for key ${key}:`, error);
      throw error;
    }
  }

  // Increment counter with expiry (useful for rate limiting)
  async incrementWithExpiry(
    key: string,
    expiryInSeconds: number,
  ): Promise<number> {
    try {
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, expiryInSeconds);
      const results = await multi.exec();
      return results[0][1] as number;
    } catch (error) {
      this.logger.error(`❌ Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  // Get all keys matching pattern (useful for debugging)
  async getKeys(pattern: string = '*'): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(
        `❌ Error getting keys with pattern ${pattern}:`,
        error,
      );
      throw error;
    }
  }

  // Clear all data (BE CAREFUL! Use only in development)
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
      this.logger.warn('🧹 All Redis data cleared!');
    } catch (error) {
      this.logger.error('❌ Error clearing Redis data:', error);
      throw error;
    }
  }
}
