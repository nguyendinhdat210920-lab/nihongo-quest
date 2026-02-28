-- Chạy trong SSMS, chọn đúng database (ví dụ: NihongoDB)
-- USE NihongoDB;
-- GO

-- Tạo bảng Decks nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Decks')
BEGIN
  CREATE TABLE Decks (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(500),
    OwnerName NVARCHAR(255),
    JlptLevel NVARCHAR(20) DEFAULT 'N5',
    IsPublic BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE()
  );
END
GO

-- Tạo bảng Flashcards nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Flashcards')
BEGIN
  CREATE TABLE Flashcards (
    Id INT PRIMARY KEY IDENTITY(1,1),
    DeckId INT NOT NULL,
    Front NVARCHAR(500) NOT NULL,
    Back NVARCHAR(500) NOT NULL,
    Example NVARCHAR(500),
    Learned BIT DEFAULT 0,
    FOREIGN KEY (DeckId) REFERENCES Decks(Id) ON DELETE CASCADE
  );
END
GO
