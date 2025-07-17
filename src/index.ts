import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import 'reflect-metadata';

// Import database configuration
import { initializeDatabase } from './config/database';

// Import routes
import customerRoutes from './routes/Customer';

// Import performance monitoring
import { performanceMonitor } from './middleware/performance';

const server: FastifyInstance = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Register plugins
async function registerPlugins() {
  // Register multipart support globally
  try {
    await server.register(require('@fastify/multipart'), {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1 // Only one file at a time
      }
    });
    console.log('✅ Multipart plugin registered globally');
  } catch (error) {
    console.log('⚠️  Multipart plugin registration failed:', error instanceof Error ? error.message : String(error));
    console.log('   File upload functionality will not be available');
  }

  // CORS
  await server.register(cors, {
    origin: true,
    credentials: true
  });

  // Security headers
  await server.register(helmet);

  // Rate limiting
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // Swagger documentation
  await server.register(swagger, {
    swagger: {
      info: {
        title: 'WorldSys API',
        description: 'A comprehensive API built with Fastify',
        version: '1.0.0'
      },
      host: 'localhost:3001',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'customers', description: 'Customer management endpoints' }
      ]
    }
  });

  await server.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    }
  });
}

// Register routes
async function registerRoutes() {
  // Add performance monitoring middleware
  server.addHook('onRequest', performanceMonitor.trackRequest());
  
  console.log('🔧 Registering customer routes...');
  await server.register(customerRoutes);
  console.log('✅ Customer routes registered');
}

// Health check endpoint
server.get('/health', {
  schema: {
    description: 'Health check endpoint',
    tags: ['health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          uptime: { type: 'number' }
        }
      }
    }
  }
}, async (request, reply) => {
  return reply.send({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
server.get('/', {
  schema: {
    description: 'API root endpoint',
    tags: ['root'],
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          version: { type: 'string' },
          documentation: { type: 'string' },
          health: { type: 'string' },
          performance: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return reply.send({
    message: 'Welcome to Fastify API',
    version: '1.0.0',
    documentation: '/documentation',
    health: '/health',
    performance: '/performance'
  });
});

// Performance monitoring endpoint
server.get('/performance', {
  schema: {
    description: 'Performance monitoring endpoint',
    tags: ['monitoring'],
    response: {
      200: {
        type: 'object',
        properties: {
          activeRequests: { type: 'number' },
          memoryUsage: {
            type: 'object',
            properties: {
              rss: { type: 'number' },
              heapTotal: { type: 'number' },
              heapUsed: { type: 'number' },
              external: { type: 'number' }
            }
          },
          uptime: { type: 'number' },
          cpuUsage: {
            type: 'object',
            properties: {
              user: { type: 'number' },
              system: { type: 'number' }
            }
          },
          cpuUsagePercentage: { type: 'number' },
          timestamp: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return reply.send(performanceMonitor.getStats());
});

// Error handler
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);
  
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    });
  }
  
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
});

// Start server
async function start() {
  try {
    // Initialize database
    await initializeDatabase();
    
    await registerPlugins();
    await registerRoutes();
    
    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port: Number(port), host });
    
    console.log(`🚀 Server started at: http://${host}:${port}`);
    console.log(`📚 Reach http://${host}:${port}/documentation for more info about the endpoints`);
    console.log(`💚 Health check available at: http://${host}:${port}/health`);
    console.log(`📊 Performance metrics at: http://${host}:${port}/performance`);
    
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Fastify server...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Fastify server...');
  await server.close();
  process.exit(0);
});

start(); 