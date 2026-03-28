-- Mở rộng Flashcards / Decks cho Học + Kiểm tra + chia sẻ link
-- Chạy trên SQL Server (SSMS), chọn đúng database.

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Decks') AND name = 'ShareToken')
  ALTER TABLE Decks ADD ShareToken NVARCHAR(40) NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Decks') AND name = 'IsOfficial')
  ALTER TABLE Decks ADD IsOfficial BIT NOT NULL CONSTRAINT DF_Decks_IsOfficial DEFAULT 0;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Flashcards') AND name = 'Hiragana')
  ALTER TABLE Flashcards ADD Hiragana NVARCHAR(500) NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Flashcards') AND name = 'ChoicesJson')
  ALTER TABLE Flashcards ADD ChoicesJson NVARCHAR(MAX) NULL;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Decks_ShareToken' AND object_id = OBJECT_ID(N'Decks'))
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX IX_Decks_ShareToken ON Decks(ShareToken) WHERE ShareToken IS NOT NULL;
END
GO
