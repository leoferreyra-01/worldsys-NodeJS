import { Customer } from "../entities/Customer";
import { DataSource } from "typeorm";

export interface IDatabaseService {
  initialize(): Promise<void>;
  getRepository<T>(entity: any): any;
  getDataSource(): DataSource;
} 

export interface ICustomerService {
  processCustomersFile(filePath: string): Promise<{processed: number, errors: number, duplicates: number}>;
  getCustomerByEmail(email: string): Promise<Customer | null>;
  getCustomers(): Promise<Customer[]>;
  getProcessingStats(): any;
}