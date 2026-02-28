-- Xóa tất cả tin nhắn trong ChatMessages (chạy khi cần reset chat)
USE NihongoDB;
GO

DELETE FROM ChatMessages;
PRINT 'Đã xóa tất cả tin nhắn.';
GO
