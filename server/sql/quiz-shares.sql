-- Chia sẻ quiz với học viên cụ thể
-- Quiz có ít nhất 1 người được share = riêng tư, chỉ creator + shared users thấy
-- Chạy trong Supabase SQL Editor

CREATE TABLE IF NOT EXISTS quiz_shares (
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  shared_with_username VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (quiz_id, shared_with_username)
);

CREATE INDEX IF NOT EXISTS idx_quiz_shares_username ON quiz_shares(shared_with_username);
