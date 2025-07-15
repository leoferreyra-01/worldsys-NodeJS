import { injectable } from 'inversify';
import { Repository, DataSource, ObjectLiteral } from 'typeorm';
import { AppDataSource } from '../config/database';
import { IDatabaseService } from '../interfaces/services';

@injectable()
export class DatabaseService implements IDatabaseService {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = AppDataSource;
  }

  async initialize(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  getRepository<T extends ObjectLiteral>(entity: any): Repository<T> {
    return this.dataSource.getRepository(entity);
  }
} 