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
  logging: true,
  entities: [Customer],
  subscribers: [],
  migrations: [],
});

// Initialize database connection
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}; 