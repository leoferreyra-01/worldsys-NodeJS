export interface IDatabaseService {
  initialize(): Promise<void>;
  getRepository<T>(entity: any): any;
} 

export interface ICustomerService {
  processCustomersFile(filePath: string): Promise<{processed: number, errors: number}>;
}