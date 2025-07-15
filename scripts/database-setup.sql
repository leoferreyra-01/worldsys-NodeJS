-- SQL Server Database Setup Script
-- Run this script in SQL Server Management Studio or sqlcmd

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'worldsys')
BEGIN
    CREATE DATABASE worldsys;
END
GO

USE worldsys;
GO

-- Create Users table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[users] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [name] NVARCHAR(255) NOT NULL,
        [email] NVARCHAR(255) UNIQUE NOT NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Create Products table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[products] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [name] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX),
        [price] DECIMAL(10,2) NOT NULL,
        [stock] INT DEFAULT 0,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Create Orders table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[orders] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [user_id] INT NOT NULL,
        [product_id] INT NOT NULL,
        [quantity] INT NOT NULL,
        [total_price] DECIMAL(10,2) NOT NULL,
        [status] NVARCHAR(50) DEFAULT 'pending',
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]),
        FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id])
    );
END
GO

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS IX_users_email ON [dbo].[users]([email]);
CREATE INDEX IF NOT EXISTS IX_orders_user_id ON [dbo].[orders]([user_id]);
CREATE INDEX IF NOT EXISTS IX_orders_product_id ON [dbo].[orders]([product_id]);
GO

PRINT 'Database setup completed successfully!';
GO 