import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClientType) {}

  // Clean up connection when module destroys
  async onModuleDestroy() {
    await this.redis.quit();
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      this.logger.log(`✅ Redis ping response: ${result}`);
      return result === 'PONG';
    } catch (error) {
      this.logger.error('❌ Redis connection test failed:', error);
      return false;
    }
  }

  // Set data with expiration (TTL in seconds)
  async setWithExpiry(
    key: string,
    value: any,
    expiryInSeconds: number,
  ): Promise<void> {
    try {
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      await this.redis.setEx(key, expiryInSeconds, stringValue);
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

  // Increment counter with expiry
  async incrementWithExpiry(
    key: string,
    expiryInSeconds: number,
  ): Promise<number> {
    try {
      // Use multi for atomic operations
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, expiryInSeconds);
      const results = await multi.exec();
      return results[0] as number;
    } catch (error) {
      this.logger.error(`❌ Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  // Get all keys matching pattern (for debugging)
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

  // Clear all data (BE CAREFUL!)
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushAll();
      this.logger.warn('🧹 All Redis data cleared!');
    } catch (error) {
      this.logger.error('❌ Error clearing Redis data:', error);
      throw error;
    }
  }

  // Set simple string value
  async set(key: string, value: string): Promise<void> {
    try {
      await this.redis.set(key, value);
      this.logger.debug(`✅ Set simple key: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Error setting simple key ${key}:`, error);
      throw error;
    }
  }

  // Get Redis info
  async getInfo(): Promise<string> {
    try {
      return await this.redis.info();
    } catch (error) {
      this.logger.error('❌ Error getting Redis info:', error);
      throw error;
    }
  }
}
