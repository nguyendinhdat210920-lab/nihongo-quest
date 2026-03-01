-- Chia sẻ bài học với học viên cụ thể
-- Chạy trong Supabase SQL Editor

CREATE TABLE IF NOT EXISTS lesson_shares (
  lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  shared_with_username VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lesson_id, shared_with_username)
);

CREATE INDEX IF NOT EXISTS idx_lesson_shares_username ON lesson_shares(shared_with_username);
