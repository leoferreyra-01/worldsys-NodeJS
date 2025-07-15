import { container } from "../config/container";
import { ICustomerService } from "../interfaces/services";
import { TYPES } from "../types/inversify";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as path from 'path';
import * as fs from 'fs';

export default async function customerRoutes (fastify: FastifyInstance) {
    const customerService = container.get<ICustomerService>(TYPES.CustomerService);

    fastify.post('/customers/:filename', {
        schema: {
            description: 'Process a customers file',
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
                        processed: { type: 'number' },
                        errors: { type: 'number' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request: FastifyRequest<{ Params: { filename: string } }>, reply: FastifyReply) => {
        try{
            const { filename } = request.params;
            const filePath = path.join(process.cwd(), 'uploads', filename);

            if (!fs.existsSync(filePath)) {
                return reply.status(404).send({ error: 'File not found' });
            }

            const result = await customerService.processCustomersFile(filePath);
            return reply.status(200).send({
                message: 'File processed successfully',
                processed: result.processed,
                errors: result.errors,
                filePath
            });
        }catch (error) {
            fastify.log.error('Error processing customers file:', error);
            return reply.status(500).send({
                error: 'Internal server error',
                message: 'An error occurred while processing the file'
            });
        }
    })
}