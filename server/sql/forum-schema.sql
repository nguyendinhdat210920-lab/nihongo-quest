-- Forum schema for Nihongo Quest
USE NihongoDB;
GO

-- ForumPosts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ForumPosts')
BEGIN
  CREATE TABLE ForumPosts (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(255) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    AuthorUsername NVARCHAR(255) NOT NULL,
    Status NVARCHAR(20) DEFAULT N'approved',
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FileUrl NVARCHAR(500) NULL,
    FileName NVARCHAR(255) NULL,
    FileType NVARCHAR(50) NULL
  );
END
GO

-- ForumComments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ForumComments')
BEGIN
  CREATE TABLE ForumComments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    PostId INT NOT NULL,
    AuthorUsername NVARCHAR(255) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PostId) REFERENCES ForumPosts(Id) ON DELETE CASCADE
  );
END
GO

-- ForumLikes (PostId + Username unique)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ForumLikes')
BEGIN
  CREATE TABLE ForumLikes (
    PostId INT NOT NULL,
    Username NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (PostId, Username),
    FOREIGN KEY (PostId) REFERENCES ForumPosts(Id) ON DELETE CASCADE
  );
END
GO

-- Optional: seed sample posts (uncomment if needed)
/*
INSERT INTO ForumPosts (Title, Content, AuthorUsername) VALUES
(N'Cách nhớ Kanji hiệu quả nhất?', N'Mình đang học N4 và gặp khó khăn với Kanji. Các bạn có tip gì không?', N'sakura_learner'),
(N'Chia sẻ tài liệu JLPT N3', N'Mình vừa tổng hợp tài liệu ôn thi N3 rất hay. Chia sẻ cho mọi người!', N'nihongo_pro'),
(N'Phân biệt は và が', N'Hai trợ từ này thường gây nhầm lẫn. Hãy cùng tìm hiểu sự khác biệt.', N'sensei_tanaka');
*/

PRINT 'Forum schema completed.';
