import { container } from "../config/container";
import { ICustomerService } from "../interfaces/services";
import { TYPES } from "../types/inversify";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as path from 'path';
import * as fs from 'fs';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

export default async function customerRoutes (fastify: FastifyInstance) {
    const customerService = container.get<ICustomerService>(TYPES.CustomerService);

    // Process customers file by filename
    fastify.post('/customers/:filename', {
        schema: {
            description: 'Process a customers file by filename',
            tags: ['customers'],
            params: {
                type: 'object',
                properties: {
                    filename: { 
                        type: 'string', 
                        description: 'The name of the file to process' 
                    }
                },
                required: ['filename']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        processed: { type: 'number' },
                        errors: { type: 'number' },
                        duplicates: { type: 'number' },
                        filePath: { type: 'string' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: {type: 'string'},
                        details: {type: 'string'}
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: {type: 'string'},
                        details: {type: 'string'}
                    }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { filename: string } }>, reply: FastifyReply) => {
        try{
            const { filename } = request.params;
            const filePath = path.join(process.cwd(), 'clients', filename);

            if (!fs.existsSync(filePath)) {
                return reply.status(404).send({ error: 'File not found' });
            }

            const result = await customerService.processCustomersFile(filePath);
            return reply.status(200).send({
                message: 'File processed successfully',
                processed: result.processed,
                errors: result.errors,
                duplicates: result.duplicates,
                filePath
            });
        }catch (error) {
            fastify.log.error('Error processing customers file:', error);
            fastify.log.error('Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'An error occurred while processing the file',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // Upload and process customers file
    fastify.post('/customers/upload', {
        schema: {
            description: 'Upload and process a customers file',
            tags: ['customers'],
            consumes: ['multipart/form-data']
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const data = await (request as any).file();
            
            if (!data) {
                return reply.status(400).send({ error: 'No file uploaded' });
            }

            // Validate file type
            const allowedTypes = ['text/plain', 'application/octet-stream', 'text/csv'];
            if (data.mimetype && !allowedTypes.includes(data.mimetype)) {
                return reply.status(400).send({ 
                    error: 'Invalid file type. Please upload a text or CSV file.' 
                });
            }

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Generate unique filename
            const originalName = data.filename || 'customers-file';
            const timestamp = Date.now();
            const filename = `${timestamp}-${originalName}`;
            const filePath = path.join(uploadsDir, filename);

            // Save the uploaded file
            const writeStream = createWriteStream(filePath);
            await pipeline(data.file, writeStream);

            // Process the uploaded file
            const result = await customerService.processCustomersFile(filePath);

            const stats = fs.statSync(filePath);

            return reply.status(200).send({
                success: true,
                message: 'File uploaded and processed successfully',
                filename: filename,
                originalName: originalName,
                filePath: filePath,
                size: stats.size,
                processed: result.processed,
                errors: result.errors,
                duplicates: result.duplicates
            });

        } catch (error) {
            fastify.log.error('Error uploading and processing customers file:', error);
            fastify.log.error('Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'An error occurred while uploading and processing the file',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    //Get customers
    fastify.get('/customers', {
        schema: {
            description: 'Get all customers',
            tags: ['customers'],
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const customers = await customerService.getCustomers();

            return reply.status(200).send({ customers });
        } catch (error) {
            fastify.log.error('Error getting customers:', error);
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'An error occurred while getting customers'
            });
        }
    });
    
    //Get customer by email
    fastify.get('/customers/email/:email', {
        schema: {
            description: 'Get customer by email',
            tags: ['customers'],
            params: {
                type: 'object',
                properties: {
                    email: { type: 'string', description: 'The email of the customer' }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { email: string } }>, reply: FastifyReply) => {
        try {
            const { email } = request.params;
            const customer = await customerService.getCustomerByEmail(email);

            if (!customer) {
                return reply.status(404).send({ error: 'Customer not found' });
            }

            return reply.status(200).send({ customer });
        } catch (error) {
            fastify.log.error('Error getting customer by email:', error);
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'An error occurred while getting customer by email'
            });
        }
    });

    // Get processing status
    fastify.get('/customers/processing/status', {
        schema: {
            description: 'Get current file processing status',
            tags: ['customers'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        isProcessing: { type: 'boolean' },
                        isConcurrent: { type: 'boolean' },
                        stats: {
                            type: ['object', 'null'],
                            properties: {
                                processed: { type: 'number' },
                                errors: { type: 'number' },
                                duplicates: { type: 'number' },
                                totalLines: { type: 'number' },
                                currentLine: { type: 'number' },
                                progress: { type: 'number' },
                                rate: { type: 'number' },
                                elapsedTime: { type: 'number' },
                                activeWorkers: { type: 'number' },
                                completedChunks: { type: 'number' },
                                totalChunks: { type: 'number' }
                            }
                        }
                    }
                }
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const stats = customerService.getProcessingStats();

            if (!stats) {
                return reply.status(200).send({
                    isProcessing: false,
                    isConcurrent: false,
                    stats: null
                });
            }

            const elapsed = Date.now() - stats.startTime.getTime();
            const progress = stats.totalLines > 0 ? (stats.currentLine / stats.totalLines) * 100 : 0;
            const rate = stats.processed / (elapsed / 1000);

            return reply.status(200).send({
                isProcessing: true,
                isConcurrent: stats.isConcurrent || false,
                stats: {
                    processed: stats.processed,
                    errors: stats.errors,
                    duplicates: stats.duplicates,
                    totalLines: stats.totalLines,
                    currentLine: stats.currentLine,
                    progress: Math.round(progress * 100) / 100,
                    rate: Math.round(rate * 100) / 100,
                    elapsedTime: Math.round(elapsed / 1000),
                    activeWorkers: stats.activeWorkers || 0,
                    completedChunks: stats.completedChunks || 0,
                    totalChunks: stats.totalChunks || 0
                }
            });
        } catch (error) {
            fastify.log.error('Error getting processing status:', error);
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'An error occurred while getting processing status'
            });
        }
    });

    // Stop concurrent processing
    fastify.post('/customers/processing/stop', {
        schema: {
            description: 'Stop current file processing',
            tags: ['customers'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        stopped: { type: 'boolean' }
                    }
                }
            }
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // This would need to be implemented in the service
            // For now, we'll return a message
            return reply.status(200).send({
                message: 'Processing stop requested',
                stopped: true
            });
        } catch (error) {
            fastify.log.error('Error stopping processing:', error);
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'An error occurred while stopping processing'
            });
        }
    });
}