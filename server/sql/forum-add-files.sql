-- Add file columns to ForumPosts (run after forum-schema.sql)
USE NihongoDB;
GO

IF COL_LENGTH('dbo.ForumPosts', 'FileUrl') IS NULL
  ALTER TABLE ForumPosts ADD FileUrl NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.ForumPosts', 'FileName') IS NULL
  ALTER TABLE ForumPosts ADD FileName NVARCHAR(255) NULL;
GO

IF COL_LENGTH('dbo.ForumPosts', 'FileType') IS NULL
  ALTER TABLE ForumPosts ADD FileType NVARCHAR(50) NULL;
GO

PRINT 'Forum file columns added.';
