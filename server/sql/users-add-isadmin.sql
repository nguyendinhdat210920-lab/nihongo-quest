-- Add IsAdmin to Users table
USE NihongoDB;
GO

IF COL_LENGTH('dbo.Users', 'IsAdmin') IS NULL
  ALTER TABLE Users ADD IsAdmin BIT DEFAULT 0;
GO

-- Set Đình Đạt as admin (run if you use this username)
UPDATE Users SET IsAdmin = 1 WHERE Username = N'Đình Đạt';
GO

PRINT 'IsAdmin column added.';
