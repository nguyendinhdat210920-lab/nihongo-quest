-- Sửa password_hash cho user Đình Đạt (mật khẩu: 123456)
-- Chạy trong Supabase SQL Editor

UPDATE users 
SET password_hash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
WHERE username = 'Đình Đạt';
