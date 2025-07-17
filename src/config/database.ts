import { DataSource } from 'typeorm';
import { Customer } from '../entities/Customer';

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'master',
  options: {
    encrypt: process.env.NODE_ENV === 'production', // Use SSL in production
    trustServerCertificate: process.env.NODE_ENV !== 'production', // Trust self-signed certs in development
    enableArithAbort: true,
  },
  synchronize: process.env.NODE_ENV !== 'production', // Auto-create tables in development
  logging: process.env.NODE_ENV === 'development',
  entities: [Customer],
  subscribers: [],
  migrations: [],
  // Connection pooling settings for large file processing
  extra: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
  },
  // TypeORM specific settings
  maxQueryExecutionTime: 30000, // 30 seconds
  cache: false, // Disable caching for large operations
});

// Initialize database connection
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');
    
    // Log connection pool info
    console.log(`📊 Database pool settings: max connections = ${AppDataSource.options.extra?.connectionLimit || 'default'}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}; 