-- ============================================
-- Migrate Users từ SQL Server sang PostgreSQL (Supabase)
-- ============================================
-- Cách dùng:
-- 1. Chạy script này trong SQL Server Management Studio (kết nối tới NihongoDB)
-- 2. Chọn Results to Text (Ctrl+T) hoặc Results to Grid
-- 3. Copy kết quả
-- 4. Paste vào Supabase SQL Editor và chạy
-- ============================================

-- Chạy query này trong SSMS, chọn Results to Text (Ctrl+T), copy cột insert_statement và paste vào Supabase SQL Editor:
SELECT 
  'INSERT INTO users (username, email, password_hash, is_banned, is_admin, created_at) VALUES (' +
  '''' + REPLACE(ISNULL(Username,''), '''', '''''') + ''', ' +
  '''' + REPLACE(ISNULL(Email,''), '''', '''''') + ''', ' +
  '''' + REPLACE(ISNULL(PasswordHash,''), '''', '''''') + ''', ' +
  CASE WHEN ISNULL(IsBanned, 0) = 1 THEN 'true' ELSE 'false' END + ', ' +
  CASE WHEN ISNULL(IsAdmin, 0) = 1 THEN 'true' ELSE 'false' END + ', ' +
  '''' + CONVERT(VARCHAR(30), ISNULL(CreatedAt, GETDATE()), 126) + '''::timestamptz) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_admin = EXCLUDED.is_admin;' AS insert_statement
FROM Users;
