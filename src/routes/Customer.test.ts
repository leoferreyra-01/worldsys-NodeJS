import fastify from 'fastify';
import customerRoutes from './Customer';
import { container } from '../config/container';
import { TYPES } from '../types/inversify';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Mock implementation of ICustomerService
const mockCustomerService = {
  getCustomers: jest.fn().mockResolvedValue([
    {
      id: 1,
      customerId: 'CUST001',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      age: 30,
      createdAt: new Date()
    }
  ]),
  processCustomersFile: jest.fn(),
  getCustomerByEmail: jest.fn().mockResolvedValue({
    id: 1,
    customerId: 'CUST001',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    age: 30,
    createdAt: new Date()
  }),
  getProcessingStats: jest.fn(),
  // ...other methods if needed
};

describe('GET /customers', () => {
  let app: ReturnType<typeof fastify>;

  beforeAll(async () => {
    // Await the async rebind and set the mock
    const rebinding = await (container as any).rebind(TYPES.CustomerService);
    if (rebinding && typeof rebinding.toConstantValue === 'function') {
      rebinding.toConstantValue(mockCustomerService);
    } else {
      throw new Error('toConstantValue is not a function on rebinding');
    }
    app = fastify();
    await app.register(customerRoutes);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return all customers', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/customers'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      customers: [
        expect.objectContaining({
          id: 1,
          customerId: 'CUST001',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          age: 30
        })
      ]
    });
    expect(mockCustomerService.getCustomers).toHaveBeenCalled();
  });
  
}); 

describe('POST /customers/:filename', () => {
  let app: ReturnType<typeof fastify>;
  const testFilename = 'testfile.dat';
  const testFilePath = `${process.cwd()}/clients/${testFilename}`;

  beforeAll(async () => {
    // Mock processCustomersFile
    mockCustomerService.processCustomersFile = jest.fn().mockResolvedValue({
      processed: 10,
      errors: 1,
      duplicates: 2,
      filePath: testFilePath
    });
    // Ensure the binding is set
    const rebinding = await (container as any).rebind(TYPES.CustomerService);
    rebinding.toConstantValue(mockCustomerService);
    app = fastify();
    await app.register(customerRoutes);
    // Create a dummy file in clients dir for the test
    const fs = require('fs');
    const path = require('path');
    const clientsDir = path.join(process.cwd(), 'clients');
    if (!fs.existsSync(clientsDir)) fs.mkdirSync(clientsDir);
    fs.writeFileSync(testFilePath, 'dummy data');
  });

  afterAll(async () => {
    // Clean up dummy file
    const fs = require('fs');
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    await app.close();
  });

  it('should process a customers file by filename', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/customers/${testFilename}`
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        processed: 10,
        errors: 1,
        duplicates: 2,
        filePath: testFilePath
      })
    );
    expect(mockCustomerService.processCustomersFile).toHaveBeenCalledWith(testFilePath);
  });

  it('should return 404 if file does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/customers/nonexistentfile.dat'
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toHaveProperty('error', 'File not found');
  });
});

describe('POST /customers/upload', () => {
  let app: ReturnType<typeof fastify>;

  beforeAll(async () => {
    mockCustomerService.processCustomersFile = jest.fn().mockResolvedValue({
      processed: 5,
      errors: 0,
      duplicates: 0
    });
    const rebinding = await (container as any).rebind(TYPES.CustomerService);
    rebinding.toConstantValue(mockCustomerService);
    app = fastify();
    await app.register(require('@fastify/multipart'));
    await app.register(customerRoutes);
  });

  afterAll(async () => {
    // Clean up uploaded files
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      fs.readdirSync(uploadsDir).forEach((f: string) => fs.unlinkSync(path.join(uploadsDir, f)));
      fs.rmdirSync(uploadsDir);
    }
    await app.close();
  });

  it('should upload and process a customers file', async () => {
    const form = new FormData();
    form.append('file', Buffer.from('id,name\n1,Test'), { filename: 'test.csv', contentType: 'text/csv' });
    const response = await app.inject({
      method: 'POST',
      url: '/customers/upload',
      payload: form.getBuffer(),
      headers: form.getHeaders()
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('processed', 5);
    expect(mockCustomerService.processCustomersFile).toHaveBeenCalled();
  });

  it('should return 400 if no file uploaded', async () => {
    const form = new FormData();
    const response = await app.inject({
      method: 'POST',
      url: '/customers/upload',
      payload: form.getBuffer(),
      headers: form.getHeaders()
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toHaveProperty('error', 'No file uploaded');
  });
}); 

describe('GET /customers/email/:email', () => {
  let app: ReturnType<typeof fastify>;
  const testEmail = 'test@example.com';

  beforeAll(async () => {
    mockCustomerService.getCustomerByEmail = jest.fn().mockResolvedValue({
      id: 1,
      customerId: 'CUST001',
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      age: 30,
      createdAt: new Date()
    });
    const rebinding = await (container as any).rebind(TYPES.CustomerService);
    rebinding.toConstantValue(mockCustomerService);
    app = fastify();
    await app.register(customerRoutes);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return a customer by email', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/customers/email/${testEmail}`
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      customer: expect.objectContaining({
        id: 1,
        customerId: 'CUST001',
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        age: 30
      })
    });
    expect(mockCustomerService.getCustomerByEmail).toHaveBeenCalledWith(testEmail);
  });

  it('should return 404 if customer not found', async () => {
    (mockCustomerService.getCustomerByEmail as jest.Mock).mockResolvedValueOnce(null);
    const response = await app.inject({
      method: 'GET',
      url: `/customers/email/notfound@example.com`
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toHaveProperty('error', 'Customer not found');
  });
});

describe('GET /customers/processing/status', () => {
  let app: ReturnType<typeof fastify>;

  beforeAll(async () => {
    mockCustomerService.getProcessingStats = jest.fn().mockReturnValue({
      processed: 100,
      errors: 2,
      duplicates: 3,
      totalLines: 200,
      currentLine: 100,
      startTime: new Date(Date.now() - 5000),
      isConcurrent: true,
      activeWorkers: 2,
      completedChunks: 5,
      totalChunks: 10
    });
    const rebinding = await (container as any).rebind(TYPES.CustomerService);
    rebinding.toConstantValue(mockCustomerService);
    app = fastify();
    await app.register(customerRoutes);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return processing stats when processing is active', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/customers/processing/status'
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('isProcessing', true);
    expect(body).toHaveProperty('isConcurrent', true);
    expect(body.stats).toHaveProperty('processed', 100);
    expect(body.stats).toHaveProperty('errors', 2);
    expect(body.stats).toHaveProperty('duplicates', 3);
    expect(body.stats).toHaveProperty('totalLines', 200);
    expect(body.stats).toHaveProperty('currentLine', 100);
    expect(body.stats).toHaveProperty('progress');
    expect(body.stats).toHaveProperty('rate');
    expect(body.stats).toHaveProperty('elapsedTime');
    expect(body.stats).toHaveProperty('activeWorkers', 2);
    expect(body.stats).toHaveProperty('completedChunks', 5);
    expect(body.stats).toHaveProperty('totalChunks', 10);
  });

  it('should return isProcessing false if no processing stats', async () => {
    (mockCustomerService.getProcessingStats as jest.Mock).mockReturnValueOnce(null);
    const response = await app.inject({
      method: 'GET',
      url: '/customers/processing/status'
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      isProcessing: false,
      isConcurrent: false,
      stats: null
    });
  });
});

describe('POST /customers/processing/stop', () => {
  let app: ReturnType<typeof fastify>;

  beforeAll(async () => {
    const rebinding = await (container as any).rebind(TYPES.CustomerService);
    rebinding.toConstantValue(mockCustomerService);
    app = fastify();
    await app.register(customerRoutes);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return stopped true and a message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/customers/processing/stop'
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('stopped', true);
    expect(body).toHaveProperty('message', 'Processing stop requested');
  });
}); 