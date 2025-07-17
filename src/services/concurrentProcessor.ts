import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

export interface ProcessingChunk {
    startLine: number;
    endLine: number;
    chunkId: number;
}

export interface WorkerResult {
    chunkId: number;
    processed: number;
    errors: number;
    duplicates: number;
    startLine: number;
    endLine: number;
}

export interface ConcurrentProcessingStats {
    totalLines: number;
    processed: number;
    errors: number;
    duplicates: number;
    activeWorkers: number;
    completedChunks: number;
    totalChunks: number;
    startTime: Date;
    progress: number;
    rate: number;
}

export class ConcurrentProcessor extends EventEmitter {
    private readonly maxWorkers: number;
    private readonly chunkSize: number;
    private activeWorkers: Map<number, Worker> = new Map();
    private completedResults: WorkerResult[] = [];
    private processingStats: ConcurrentProcessingStats;
    private isProcessing: boolean = false;

    constructor(maxWorkers: number = 4, chunkSize: number = 1000) {
        super();
        this.maxWorkers = maxWorkers;
        this.chunkSize = chunkSize;
        this.processingStats = this.initializeStats();
    }

    private initializeStats(): ConcurrentProcessingStats {
        return {
            totalLines: 0,
            processed: 0,
            errors: 0,
            duplicates: 0,
            activeWorkers: 0,
            completedChunks: 0,
            totalChunks: 0,
            startTime: new Date(),
            progress: 0,
            rate: 0
        };
    }

    async processFileConcurrently(filePath: string): Promise<{ processed: number; errors: number; duplicates: number }> {
        if (this.isProcessing) {
            throw new Error('Already processing a file');
        }

        this.isProcessing = true;
        this.processingStats = this.initializeStats();
        this.processingStats.startTime = new Date();

        try {
            // Count total lines
            this.processingStats.totalLines = await this.countLines(filePath);
            console.log(`📊 Total lines to process: ${this.processingStats.totalLines}`);

            // Create chunks
            const chunks = this.createChunks(this.processingStats.totalLines);
            this.processingStats.totalChunks = chunks.length;
            console.log(`🔧 Created ${chunks.length} chunks with ${this.chunkSize} lines each`);

            // Process chunks with worker threads
            const results = await this.processChunksWithWorkers(filePath, chunks);

            // Aggregate results
            const finalStats = this.aggregateResults(results);
            this.logFinalStats(finalStats);

            return finalStats;

        } catch (error) {
            console.error('Error in concurrent processing:', error);
            throw error;
        } finally {
            this.isProcessing = false;
            this.activeWorkers.clear();
        }
    }

    private createChunks(totalLines: number): ProcessingChunk[] {
        const chunks: ProcessingChunk[] = [];
        let chunkId = 0;

        for (let startLine = 0; startLine < totalLines; startLine += this.chunkSize) {
            const endLine = Math.min(startLine + this.chunkSize, totalLines);
            chunks.push({
                startLine,
                endLine,
                chunkId: chunkId++
            });
        }

        return chunks;
    }

    private async processChunksWithWorkers(filePath: string, chunks: ProcessingChunk[]): Promise<WorkerResult[]> {
        return new Promise((resolve, reject) => {
            const results: WorkerResult[] = [];
            let completedChunks = 0;
            let nextChunkIndex = 0;

            const processNextChunk = () => {
                if (nextChunkIndex >= chunks.length) {
                    return; // No more chunks to process
                }

                if (this.activeWorkers.size >= this.maxWorkers) {
                    return; // Max workers reached
                }

                const chunk = chunks[nextChunkIndex++];
                this.processChunk(filePath, chunk)
                    .then(result => {
                        results.push(result);
                        completedChunks++;
                        this.processingStats.completedChunks = completedChunks;
                        this.processingStats.processed += result.processed;
                        this.processingStats.errors += result.errors;
                        this.processingStats.duplicates += result.duplicates;

                        // Calculate progress
                        const progress = (completedChunks / chunks.length) * 100;
                        this.processingStats.progress = Math.round(progress * 100) / 100;

                        // Calculate rate
                        const elapsed = Date.now() - this.processingStats.startTime.getTime();
                        this.processingStats.rate = this.processingStats.processed / (elapsed / 1000);

                        // Log progress every 10 chunks
                        if (completedChunks % 10 === 0 || completedChunks === chunks.length) {
                            this.logProgress();
                        }

                        // Emit progress event
                        this.emit('progress', this.processingStats);

                        // Process next chunk
                        processNextChunk();

                        // Check if all chunks are completed
                        if (completedChunks === chunks.length) {
                            resolve(results);
                        }
                    })
                    .catch(error => {
                        console.error(`Error processing chunk ${chunk.chunkId}:`, error);
                        reject(error);
                    });
            };

            // Start processing chunks
            for (let i = 0; i < Math.min(this.maxWorkers, chunks.length); i++) {
                processNextChunk();
            }
        });
    }

    private async processChunk(filePath: string, chunk: ProcessingChunk): Promise<WorkerResult> {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.join(__dirname, 'fileProcessorWorker.js'), {
                workerData: {
                    filePath,
                    chunk,
                    databaseConfig: {
                        server: process.env.DB_HOST || 'localhost',
                        port: parseInt(process.env.DB_PORT || '1433'),
                        user: process.env.DB_USERNAME || 'sa',
                        password: process.env.DB_PASSWORD || '',
                        database: process.env.DB_NAME || 'master',
                        options: {
                            encrypt: process.env.NODE_ENV === 'production',
                            trustServerCertificate: process.env.NODE_ENV !== 'production',
                            enableArithAbort: true
                        }
                    }
                }
            });

            this.activeWorkers.set(chunk.chunkId, worker);
            this.processingStats.activeWorkers = this.activeWorkers.size;

            worker.on('message', (result: WorkerResult) => {
                this.activeWorkers.delete(chunk.chunkId);
                this.processingStats.activeWorkers = this.activeWorkers.size;
                resolve(result);
            });

            worker.on('error', (error) => {
                this.activeWorkers.delete(chunk.chunkId);
                this.processingStats.activeWorkers = this.activeWorkers.size;
                reject(error);
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
    }

    private async countLines(filePath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            let lineCount = 0;
            const stream = fs.createReadStream(filePath);
            const readline = require('readline');

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

    private aggregateResults(results: WorkerResult[]): { processed: number; errors: number; duplicates: number } {
        const totalProcessed = results.reduce((sum, result) => sum + result.processed, 0);
        const totalErrors = results.reduce((sum, result) => sum + result.errors, 0);
        const totalDuplicates = results.reduce((sum, result) => sum + result.duplicates, 0);

        return {
            processed: totalProcessed,
            errors: totalErrors,
            duplicates: totalDuplicates
        };
    }

    private logProgress(): void {
        const elapsed = Date.now() - this.processingStats.startTime.getTime();
        console.log(`📈 Progress: ${this.processingStats.progress}% (${this.processingStats.completedChunks}/${this.processingStats.totalChunks} chunks)`);
        console.log(`   Processed: ${this.processingStats.processed}, Errors: ${this.processingStats.errors}, Duplicates: ${this.processingStats.duplicates}`);
        console.log(`   Active Workers: ${this.processingStats.activeWorkers}, Rate: ${this.processingStats.rate.toFixed(2)} records/sec`);
    }

    private logFinalStats(finalStats: { processed: number; errors: number; duplicates: number }): void {
        const elapsed = Date.now() - this.processingStats.startTime.getTime();
        const rate = this.processingStats.processed / (elapsed / 1000);

        console.log('\n🎉 Concurrent processing completed!');
        console.log(`📊 Final Stats:`);
        console.log(`   Total processed: ${finalStats.processed}`);
        console.log(`   Total errors: ${finalStats.errors}`);
        console.log(`   Total duplicates: ${finalStats.duplicates}`);
        console.log(`   Total time: ${(elapsed / 1000).toFixed(2)} seconds`);
        console.log(`   Average rate: ${rate.toFixed(2)} records/sec`);
        console.log(`   Workers used: ${this.maxWorkers}`);
    }

    getProcessingStats(): ConcurrentProcessingStats | null {
        return this.isProcessing ? this.processingStats : null;
    }

    stopProcessing(): void {
        if (this.isProcessing) {
            console.log('🛑 Stopping concurrent processing...');
            this.activeWorkers.forEach(worker => worker.terminate());
            this.activeWorkers.clear();
            this.isProcessing = false;
        }
    }
} 