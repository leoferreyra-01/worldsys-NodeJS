import { Customer } from "../entities/Customer";
import { ICustomerService, IDatabaseService } from "../interfaces/services";
import { TYPES } from "../types/inversify";
import { inject, injectable } from "inversify";
import { Repository } from "typeorm";
import * as fs from 'fs';
import * as readline from 'readline';
import { ConcurrentProcessor, ConcurrentProcessingStats } from './concurrentProcessor';

interface ProcessingStats {
    processed: number;
    errors: number;
    duplicates: number;
    totalLines: number;
    currentLine: number;
    startTime: Date;
    estimatedTimeRemaining?: number;
}

@injectable()
export class CustomerService implements ICustomerService {
    private customerRepository: Repository<Customer>;
    private processingStats: ProcessingStats | null = null;
    private readonly BATCH_SIZE = 100; // Process 100 records at a time
    private readonly CONCURRENT_THRESHOLD = 1000; // Use concurrent processing for files with more than 1k lines
    private concurrentProcessor: ConcurrentProcessor;

    constructor(
        @inject(TYPES.DatabaseService) private databaseService: IDatabaseService
    ) {
        this.customerRepository = this.databaseService.getRepository(Customer);
        this.concurrentProcessor = new ConcurrentProcessor(4, 10000); // 4 workers, 10k lines per chunk
    }

    async processCustomersFile(filePath: string): Promise<{ processed: number; errors: number; duplicates: number }> {
        // Check file size to decide processing method
        const fileStats = fs.statSync(filePath);
        const estimatedLines = Math.ceil(fileStats.size / 50); // Rough estimate: ~50 bytes per line

        if (estimatedLines > this.CONCURRENT_THRESHOLD) {
            console.log(`🚀 Large file detected (${estimatedLines} estimated lines). Using concurrent processing...`);
            return this.processFileConcurrently(filePath);
        } else {
            console.log(`📄 Small file detected (${estimatedLines} estimated lines). Using sequential processing...`);
            return this.processFileSequentially(filePath);
        }
    }

    private async processFileConcurrently(filePath: string): Promise<{ processed: number; errors: number; duplicates: number }> {
        // Set up progress monitoring
        this.concurrentProcessor.on('progress', (stats: ConcurrentProcessingStats) => {
            this.processingStats = {
                processed: stats.processed,
                errors: stats.errors,
                duplicates: stats.duplicates,
                totalLines: stats.totalLines,
                currentLine: stats.processed, // Approximate
                startTime: stats.startTime,
                estimatedTimeRemaining: this.calculateEstimatedTime(stats)
            };
        });

        try {
            const result = await this.concurrentProcessor.processFileConcurrently(filePath);
            return result;
        } catch (error) {
            console.error('Error in concurrent processing:', error);
            throw error;
        }
    }

    private async processFileSequentially(filePath: string): Promise<{ processed: number; errors: number; duplicates: number }> {
        // Initialize processing stats
        this.processingStats = {
            processed: 0,
            errors: 0,
            duplicates: 0,
            totalLines: 0,
            currentLine: 0,
            startTime: new Date()
        };

        // Count total lines for progress tracking
        this.processingStats.totalLines = await this.countLines(filePath);
        console.log(`📊 Total lines to process: ${this.processingStats.totalLines}`);

        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let batch: Partial<Customer>[] = [];
        let processed = 0;
        let errors = 0;
        let duplicates = 0;
        try {
            for await (const line of rl) {
                this.processingStats.currentLine++;
                
                try {
                    if (this.validateLine(line)) {
                        const customerData = this.parseLine(line);
                        batch.push(customerData);

                        // Process batch when it reaches the batch size
                        if (batch.length >= this.BATCH_SIZE) {
                            const batchResult = await this.processBatch(batch);
                            processed += batchResult.processed;
                            errors += batchResult.errors;
                            duplicates += batchResult.duplicates;
                            this.processingStats.processed += batchResult.processed;
                            this.processingStats.errors += batchResult.errors;
                            this.processingStats.duplicates += batchResult.duplicates;
                            
                            // Log progress every 10,000 records
                            if (this.processingStats.processed % 10000 === 0) {
                                this.logProgress();
                            }
                            
                            batch = []; // Reset batch
                        }
                    } else {
                        errors++;
                        this.processingStats.errors++;
                    }
                } catch (error) {
                    errors++;
                    this.processingStats.errors++;
                    console.error(`Error processing line ${this.processingStats.currentLine}:`, error);
                }
            }

            // Process remaining records in the last batch
            if (batch.length > 0) {
                const batchResult = await this.processBatch(batch);
                processed += batchResult.processed;
                errors += batchResult.errors;
                duplicates += batchResult.duplicates;
                this.processingStats.processed += batchResult.processed;
                this.processingStats.errors += batchResult.errors;
                this.processingStats.duplicates += batchResult.duplicates;
            }

            this.logFinalStats();
            return { processed, errors, duplicates };

        } catch (error) {
            console.error('Error during file processing:', error);
            throw error;
        } finally {
            this.processingStats = null;
        }
    }

    private calculateEstimatedTime(stats: ConcurrentProcessingStats): number {
        if (stats.rate <= 0) return 0;
        const remainingLines = stats.totalLines - stats.processed;
        return remainingLines / stats.rate;
    }

    private async processBatch(batch: Partial<Customer>[]): Promise<{ processed: number; errors: number; duplicates: number }> {
        let processed = 0;
        let errors = 0;
        let duplicates = 0;

        try {
            // Use a transaction for batch processing
            await this.databaseService.getDataSource().transaction(async (manager: any) => {
                const customerRepo = manager.getRepository(Customer);

                for (const customerData of batch) {
                    try {
                        // Check for existing customers
                        const existingCustomer = await customerRepo.findOne({
                            where: { customerId: customerData.customerId }
                        });

                        if (existingCustomer) {
                            duplicates++;
                            console.log(`⚠️  Duplicate customerId found: ${customerData.customerId}`);
                            continue;
                        }

                        const customer = customerRepo.create(customerData);
                        await customerRepo.save(customer);
                        processed++;
                    } catch (error) {
                        errors++;
                        console.error(`Error processing customer ${customerData.customerId}:`, error);
                    }
                }
            });
        } catch (error) {
            console.error('Error in batch transaction:', error);
            errors += batch.length; // Mark all records in batch as errors
        }

        return { processed, errors, duplicates };
    }

    private async countLines(filePath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            let lineCount = 0;
            const stream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: stream,
                crlfDelay: Infinity
            });

            rl.on('line', () => {
                lineCount++;
            });

            rl.on('close', () => {
                resolve(lineCount);
            });

            rl.on('error', reject);
        });
    }

    private logProgress(): void {
        if (!this.processingStats) return;

        const elapsed = Date.now() - this.processingStats.startTime.getTime();
        const progress = (this.processingStats.currentLine / this.processingStats.totalLines) * 100;
        const rate = this.processingStats.processed / (elapsed / 1000); // records per second

        console.log(`📈 Progress: ${progress.toFixed(2)}% (${this.processingStats.currentLine}/${this.processingStats.totalLines})`);
        console.log(`   Processed: ${this.processingStats.processed}, Errors: ${this.processingStats.errors}, Duplicates: ${this.processingStats.duplicates}`);
        console.log(`   Rate: ${rate.toFixed(2)} records/sec`);
    }

    private logFinalStats(): void {
        if (!this.processingStats) return;

        const elapsed = Date.now() - this.processingStats.startTime.getTime();
        const rate = this.processingStats.processed / (elapsed / 1000);

        console.log('\n🎉 Processing completed!');
        console.log(`📊 Final Stats:`);
        console.log(`   Total processed: ${this.processingStats.processed}`);
        console.log(`   Total errors: ${this.processingStats.errors}`);
        console.log(`   Total duplicates: ${this.processingStats.duplicates}`);
        console.log(`   Total time: ${(elapsed / 1000).toFixed(2)} seconds`);
        console.log(`   Average rate: ${rate.toFixed(2)} records/sec`);
    }

    getProcessingStats(): any {
        // Return concurrent processor stats if available, otherwise sequential stats
        const concurrentStats = this.concurrentProcessor.getProcessingStats();
        if (concurrentStats) {
            return {
                isConcurrent: true,
                ...concurrentStats
            };
        }
        
        if (this.processingStats) {
            return {
                isConcurrent: false,
                ...this.processingStats
            };
        }
        
        return null;
    }

    validateLine (line: string): boolean {
        // Skip empty lines
        if (!line || line.trim().length === 0) {
            return false;
        }

        const parts = line.split('|');

        if (parts.length < 5) {
            return false;
        }

        const [customerId, firstName, lastName, email, age] = parts;

        // Basic validation for required fields
        if (!customerId || !firstName || !lastName) {
            return false;
        }

        // Clean customerId (remove leading zeros and validate)
        const cleanCustomerId = customerId.trim();
        if (cleanCustomerId.length === 0) {
            return false;
        }

        // Validate email if present
        if (email && email.trim().length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return false;
            }
        }

        // Validate age if present
        if (age && age.trim().length > 0) {
            const parsedAge = parseInt(age.trim());
            if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
                return false;
            }
        }

        return true;
    }

    parseLine (line: string): Partial<Customer> {
        const parts = line.split('|');
        const [customerId, firstName, lastName, email, age] = parts;

        return {
            customerId,
            firstName,
            lastName,
            email,
            age: parseInt(age)
        }
    }

    async getCustomers(): Promise<Customer[]> {
        return this.customerRepository.find();
    }

    async getCustomerByEmail(email: string): Promise<Customer | null> {
        return this.customerRepository.findOne({
            where: { email }
        });
    }
}