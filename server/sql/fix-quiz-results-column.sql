-- Sửa cột total_question -> total_questions (nếu DB có total_question)
-- Chạy trong Supabase SQL Editor

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quiz_results' AND column_name = 'total_question'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quiz_results' AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE quiz_results RENAME COLUMN total_question TO total_questions;
    RAISE NOTICE 'Đã đổi cột total_question thành total_questions';
  END IF;
END $$;
