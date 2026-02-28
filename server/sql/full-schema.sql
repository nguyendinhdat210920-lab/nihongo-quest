-- ============================================
-- Nihongo Quest - Full Database Schema
-- Chạy trong SQL Server Management Studio
-- ============================================

-- Tạo database nếu chưa có (chạy riêng nếu cần)
-- CREATE DATABASE NihongoDB;
-- GO

USE NihongoDB;  -- Đổi tên nếu bạn dùng DB khác
GO

-- 1. Users
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
  CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(255),
    PasswordHash NVARCHAR(255) NOT NULL,
    IsBanned BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE()
  );
END
GO

IF COL_LENGTH('dbo.Users', 'IsBanned') IS NULL
  ALTER TABLE Users ADD IsBanned BIT DEFAULT 0;
GO

IF COL_LENGTH('dbo.Users', 'IsAdmin') IS NULL
  ALTER TABLE Users ADD IsAdmin BIT DEFAULT 0;
GO

-- 2. Lessons
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Lessons')
BEGIN
  CREATE TABLE Lessons (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(255),
    Content NVARCHAR(MAX),
    CreatedBy NVARCHAR(255),
    AttachmentUrl NVARCHAR(500),
    AttachmentType NVARCHAR(50),
    CreatedAt DATETIME2 DEFAULT GETDATE()
  );
END
GO

IF COL_LENGTH('dbo.Lessons', 'Status') IS NULL
  ALTER TABLE Lessons ADD Status NVARCHAR(20) DEFAULT N'approved';
GO

IF COL_LENGTH('dbo.Lessons', 'IsPublic') IS NULL
  ALTER TABLE Lessons ADD IsPublic BIT DEFAULT 1;
GO

IF COL_LENGTH('dbo.Lessons', 'AttachmentUrl') IS NULL
  ALTER TABLE Lessons ADD AttachmentUrl NVARCHAR(500);
GO

IF COL_LENGTH('dbo.Lessons', 'AttachmentType') IS NULL
  ALTER TABLE Lessons ADD AttachmentType NVARCHAR(50);
GO

-- 3. Materials
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Materials')
BEGIN
  CREATE TABLE Materials (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(255) NOT NULL,
    Course NVARCHAR(255),
    Tags NVARCHAR(MAX),
    FileUrl NVARCHAR(500),
    FileType NVARCHAR(50),
    UploaderName NVARCHAR(255),
    Status NVARCHAR(50) DEFAULT 'approved',
    CreatedAt DATETIME2 DEFAULT GETDATE()
  );
END
GO

-- 4. Quizzes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Quizzes')
BEGIN
  CREATE TABLE Quizzes (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(500),
    CreatorName NVARCHAR(255),
    QuestionCount INT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE()
  );
END
GO

-- 5. QuizQuestions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'QuizQuestions')
BEGIN
  CREATE TABLE QuizQuestions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    QuizId INT NOT NULL,
    QuestionText NVARCHAR(500),
    OptionA NVARCHAR(255),
    OptionB NVARCHAR(255),
    OptionC NVARCHAR(255),
    OptionD NVARCHAR(255),
    CorrectOption NVARCHAR(1),
    FOREIGN KEY (QuizId) REFERENCES Quizzes(Id) ON DELETE CASCADE
  );
END
GO

-- 6. QuizResults
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'QuizResults')
BEGIN
  CREATE TABLE QuizResults (
    Id INT PRIMARY KEY IDENTITY(1,1),
    QuizId INT NOT NULL,
    Username NVARCHAR(255),
    Score INT,
    TotalQuestions INT,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (QuizId) REFERENCES Quizzes(Id) ON DELETE CASCADE
  );
END
GO

-- 7. Decks (Flashcards)
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

-- 8. Flashcards
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

-- ============================================
-- Dữ liệu mẫu (tùy chọn - bỏ comment nếu cần)
-- ============================================

/*
-- 3 bài học mẫu
INSERT INTO Lessons (Title, Content, CreatedBy, Status) VALUES
(N'Xin chào Nihongo!', N'Giới thiệu cơ bản về khóa học tiếng Nhật của bạn.', N'Hệ thống', N'approved'),
(N'Bài học 1: Hiragana', N'Học bảng chữ cái Hiragana với ví dụ và cách đọc.', N'Hệ thống', N'approved'),
(N'Bài học 2: Chào hỏi', N'Các mẫu câu chào hỏi cơ bản trong tiếng Nhật: おはよう, こんにちは, こんばんは...', N'Hệ thống', N'approved');
*/

PRINT 'Schema setup completed.';
GO
