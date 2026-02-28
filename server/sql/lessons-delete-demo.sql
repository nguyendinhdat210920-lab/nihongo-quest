-- Xóa các bài học demo/ảo (CreatedBy = @system)
USE NihongoDB;
GO

DELETE FROM Lessons WHERE CreatedBy = N'@system' OR CreatedBy = N'system';
PRINT 'Đã xóa các bài học demo.';
GO
