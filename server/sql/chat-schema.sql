-- Chat schema for Nihongo Quest
USE NihongoDB;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChatMessages')
BEGIN
  CREATE TABLE ChatMessages (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(255) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE()
  );
END
GO

PRINT 'Chat schema completed.';
