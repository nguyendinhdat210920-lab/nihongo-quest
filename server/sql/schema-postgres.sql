-- Nihongo Quest - PostgreSQL Schema (Supabase)
-- Chạy trong Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_banned BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  created_by VARCHAR(255),
  attachment_url VARCHAR(500),
  attachment_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'approved',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Lesson shares (giáo viên chia sẻ bài học với học viên)
CREATE TABLE IF NOT EXISTS lesson_shares (
  lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  shared_with_username VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lesson_id, shared_with_username)
);
CREATE INDEX IF NOT EXISTS idx_lesson_shares_username ON lesson_shares(shared_with_username);

-- 3. Materials
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course VARCHAR(255),
  tags TEXT,
  file_url VARCHAR(500),
  file_type VARCHAR(50),
  uploader_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  creator_name VARCHAR(255),
  question_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4b. Quiz shares (giáo viên chia sẻ quiz với học viên)
CREATE TABLE IF NOT EXISTS quiz_shares (
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  shared_with_username VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (quiz_id, shared_with_username)
);
CREATE INDEX IF NOT EXISTS idx_quiz_shares_username ON quiz_shares(shared_with_username);

-- 5. QuizQuestions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text VARCHAR(500),
  option_a VARCHAR(255),
  option_b VARCHAR(255),
  option_c VARCHAR(255),
  option_d VARCHAR(255),
  correct_option VARCHAR(1)
);

-- 6. QuizResults
CREATE TABLE IF NOT EXISTS quiz_results (
  id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  username VARCHAR(255),
  score INT,
  total_questions INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Decks (Flashcards)
CREATE TABLE IF NOT EXISTS decks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  owner_username VARCHAR(255),
  jlpt_level VARCHAR(20) DEFAULT 'N5',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id SERIAL PRIMARY KEY,
  deck_id INT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front VARCHAR(500) NOT NULL,
  back VARCHAR(500) NOT NULL,
  example VARCHAR(500),
  learned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ForumPosts
CREATE TABLE IF NOT EXISTS forum_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_username VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_type VARCHAR(50)
);

-- 10. ForumComments
CREATE TABLE IF NOT EXISTS forum_comments (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_username VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ForumLikes
CREATE TABLE IF NOT EXISTS forum_likes (
  post_id INT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, username)
);

-- 12. ChatMessages
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PasswordResetTokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
