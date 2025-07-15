import { Container } from 'inversify';
import { TYPES } from '../types/inversify';
import { IDatabaseService, ICustomerService } from '../interfaces/services';
import { DatabaseService } from '../services/databaseService';
import { CustomerService } from '../services/customerService';

const container = new Container();

// Bind services to their interfaces
container.bind<ICustomerService>(TYPES.CustomerService).to(CustomerService);
container.bind<IDatabaseService>(TYPES.DatabaseService).to(DatabaseService);

export { container }; 