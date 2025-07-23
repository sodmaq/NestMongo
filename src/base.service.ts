import { Model } from 'mongoose';
import { Document } from 'mongoose';

export class BaseService<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async getAllPaginated(
    query: Record<string, any>,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    result: T[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;

    const [result, totalCount] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      result,
      totalCount,
      totalPages,
      currentPage: page,
    };
  }
}
