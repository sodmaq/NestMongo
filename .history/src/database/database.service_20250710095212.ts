// src/database/database.service.ts
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async cleanDb() {
    const collections = Object.keys(this.connection.collections);
    for (const name of collections) {
      const collection = this.connection.collections[name];
      await collection.deleteMany({});
    }
  }

  getConnection() {
    return this.connection;
  }
}
