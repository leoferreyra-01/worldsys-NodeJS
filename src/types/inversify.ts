export const TYPES = {
  // Services
  UserService: Symbol.for('UserService'),
  ProductService: Symbol.for('ProductService'),
  OrderService: Symbol.for('OrderService'),
  CustomerService: Symbol.for('CustomerService'),
  // Repositories
  UserRepository: Symbol.for('UserRepository'),
  ProductRepository: Symbol.for('ProductRepository'),
  OrderRepository: Symbol.for('OrderRepository'),
  CustomerRepository: Symbol.for('CustomerRepository'),
  // Database
  DatabaseService: Symbol.for('DatabaseService'),
  
  // Fastify
  FastifyInstance: Symbol.for('FastifyInstance')
}; 