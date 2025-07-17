-- Database Setup Script for WorldSys Node.js Challenge
-- This script creates the customers table for storing processed customer data

USE master;
GO

-- Drop the customers table if it exists
IF OBJECT_ID('dbo.customers', 'U') IS NOT NULL
    DROP TABLE dbo.customers;
GO

-- Create the customers table
CREATE TABLE customers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customerId VARCHAR(255) NOT NULL,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE()
);
GO

-- Create indexes for better performance
CREATE INDEX IX_customers_customerId ON customers(customerId);
CREATE INDEX IX_customers_email ON customers(email);
CREATE INDEX IX_customers_createdAt ON customers(createdAt);
GO

-- Create a unique constraint on customerId to prevent duplicates
CREATE UNIQUE INDEX UQ_customers_customerId ON customers(customerId);
GO

-- Add some helpful comments
PRINT '✅ Customers table created successfully!';
PRINT '📊 Table structure:';
PRINT '   - id: Auto-incrementing primary key';
PRINT '   - customerId: Unique customer identifier';
PRINT '   - firstName: Customer first name';
PRINT '   - lastName: Customer last name';
PRINT '   - email: Customer email address';
PRINT '   - age: Customer age';
PRINT '   - createdAt: Timestamp of record creation';
PRINT '';
PRINT '🔍 Indexes created for optimal performance:';
PRINT '   - Primary key index on id';
PRINT '   - Index on customerId for lookups';
PRINT '   - Index on email for searches';
PRINT '   - Index on createdAt for date-based queries';
PRINT '   - Unique constraint on customerId to prevent duplicates';
GO 