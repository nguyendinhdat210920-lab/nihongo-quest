-- Sửa bảng Decks thiếu cột OwnerName (và các cột khác nếu cần)
-- Chạy trong SSMS, chọn đúng database (ví dụ: NihongoDB)
-- USE NihongoDB;
-- GO

-- Thêm OwnerName nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Decks') AND name = 'OwnerName')
BEGIN
  ALTER TABLE Decks ADD OwnerName NVARCHAR(255) NULL;
END
GO

-- Thêm JlptLevel nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Decks') AND name = 'JlptLevel')
BEGIN
  ALTER TABLE Decks ADD JlptLevel NVARCHAR(20) DEFAULT 'N5';
END
GO

-- Thêm IsPublic nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Decks') AND name = 'IsPublic')
BEGIN
  ALTER TABLE Decks ADD IsPublic BIT DEFAULT 1;
END
GO

-- Thêm CreatedAt nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Decks') AND name = 'CreatedAt')
BEGIN
  ALTER TABLE Decks ADD CreatedAt DATETIME2 DEFAULT GETDATE();
END
GO
