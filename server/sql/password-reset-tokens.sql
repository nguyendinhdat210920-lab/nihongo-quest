-- Bang luu token dat lai mat khau
USE NihongoDB;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PasswordResetTokens')
BEGIN
  CREATE TABLE PasswordResetTokens (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) NOT NULL,
    Token NVARCHAR(255) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE()
  );
  CREATE INDEX IX_PasswordResetTokens_Token ON PasswordResetTokens(Token);
  CREATE INDEX IX_PasswordResetTokens_Email ON PasswordResetTokens(Email);
END
GO

PRINT 'PasswordResetTokens schema completed.';
GO
