const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const readline = require('readline');
const sql = require('mssql');

// Database configuration
const dbConfig = workerData.databaseConfig;
const { filePath, chunk } = workerData;

async function processChunk() {
    let processed = 0;
    let errors = 0;
    let duplicates = 0;
    let currentLine = 0;

    try {
        // Connect to database
        const pool = await sql.connect(dbConfig);
        
        // Create a transaction for this chunk
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            for await (const line of rl) {
                currentLine++;

                // Skip lines outside our chunk
                if (currentLine < chunk.startLine || currentLine > chunk.endLine) {
                    continue;
                }

                try {
                    if (validateLine(line)) {
                        const customerData = parseLine(line);

                        // Check for existing customers
                        const existingResult = await transaction.request()
                            .input('customerId', sql.VarChar, customerData.customerId)
                            .query(`
                                SELECT TOP 1 customerId 
                                FROM customers 
                                WHERE customerId = @customerId
                            `);

                        if (existingResult.recordset.length > 0) {
                            duplicates++;
                            continue;
                        }

                        // Insert new customer
                        await transaction.request()
                            .input('customerId', sql.VarChar, customerData.customerId)
                            .input('firstName', sql.VarChar, customerData.firstName)
                            .input('lastName', sql.VarChar, customerData.lastName)
                            .input('email', sql.VarChar, customerData.email)
                            .input('age', sql.Int, customerData.age)
                            .query(`
                                INSERT INTO customers (customerId, firstName, lastName, email, age)
                                VALUES (@customerId, @firstName, @lastName, @email, @age)
                            `);

                        processed++;
                    } else {
                        errors++;
                    }
                } catch (error) {
                    errors++;
                    console.error(`Error processing line ${currentLine}:`, error);
                }
            }

            // Commit transaction
            await transaction.commit();

            // Send result back to main thread
            parentPort.postMessage({
                chunkId: chunk.chunkId,
                processed,
                errors,
                duplicates,
                startLine: chunk.startLine,
                endLine: chunk.endLine
            });

        } catch (error) {
            // Rollback transaction on error
            await transaction.rollback();
            throw error;
        } finally {
            await pool.close();
        }

    } catch (error) {
        console.error(`Worker error for chunk ${chunk.chunkId}:`, error);
        parentPort.postMessage({
            chunkId: chunk.chunkId,
            processed: 0,
            errors: chunk.endLine - chunk.startLine + 1,
            duplicates: 0,
            startLine: chunk.startLine,
            endLine: chunk.endLine
        });
    }
}

function validateLine(line) {
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

function parseLine(line) {
    const parts = line.split('|');
    const [customerId, firstName, lastName, email, age] = parts;

    return {
        customerId,
        firstName,
        lastName,
        email,
        age: parseInt(age)
    };
}

// Start processing
processChunk().catch(error => {
    console.error('Worker thread error:', error);
    process.exit(1);
}); 