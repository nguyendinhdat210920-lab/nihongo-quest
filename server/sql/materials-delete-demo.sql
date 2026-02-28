-- Xóa tài liệu demo (tài liệu mẫu / tài liệu hệ thống)
USE NihongoDB;
GO

-- Xóa tài liệu có tên "Tài liệu" hoặc "Tài liệu mẫu" hoặc từ uploader hệ thống
DELETE FROM Materials 
WHERE Title = N'Tài liệu' 
   OR Title LIKE N'Tài liệu mẫu%' 
   OR Title LIKE N'Tài liệu demo%'
   OR UploaderName IN (N'@system', N'system', N'Hệ thống');
PRINT 'Đã xóa tài liệu demo khỏi mục Tài liệu.';
GO
