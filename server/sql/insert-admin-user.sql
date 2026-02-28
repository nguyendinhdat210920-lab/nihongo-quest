-- Thêm tài khoản admin vào Supabase
-- Chạy trong Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor
-- Mật khẩu: 123456 (có thể đổi sau khi đăng nhập)

INSERT INTO users (username, email, password_hash, is_banned, is_admin, created_at)
VALUES (
  'Đình Đạt',
  NULL,
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  false,
  true,
  NOW()
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_admin = EXCLUDED.is_admin;
