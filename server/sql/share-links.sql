-- Link chia sẻ - giáo viên bấm Chia sẻ, copy link gửi cho học viên
-- Chạy trong Supabase SQL Editor

CREATE TABLE IF NOT EXISTS lesson_share_tokens (
  lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_share_tokens (
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
