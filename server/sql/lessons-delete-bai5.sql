-- Xóa bài học "Bài 5" (và các biến thể tên tương tự)
USE NihongoDB;
GO

DELETE FROM Lessons WHERE Title LIKE N'%Bài 5%' OR Title LIKE N'%bài 5%';
PRINT 'Đã xóa bài 5 khỏi mục Bài học.';
GO
