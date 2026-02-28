-- Xóa các quiz demo (system + tài khoản mẫu)
-- QuizQuestions và QuizResults sẽ tự xóa theo CASCADE
USE NihongoDB;
GO

DELETE FROM Quizzes WHERE CreatorName IN (N'@system', N'system', N'sakura_learner', N'nihongo_pro', N'sensei_tanaka');
PRINT 'Đã xóa các quiz demo.';
GO
