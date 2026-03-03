-- Tạo 2 bucket trong Supabase Storage (file không mất khi Render restart)
-- Chạy trong Supabase Dashboard: Storage -> New bucket

-- Bucket 1: materials (tài liệu)
-- Bucket 2: forum (file đính kèm diễn đàn)

-- Cách thủ công:
-- 1. Vào Supabase Dashboard -> Storage
-- 2. New bucket -> Tên: materials -> Bật Public -> Create
-- 3. New bucket -> Tên: forum -> Bật Public -> Create

-- Sau đó thêm env vars trên Render:
-- SUPABASE_URL = https://YOUR_PROJECT.supabase.co
-- SUPABASE_SERVICE_ROLE_KEY = eyJ... (từ Settings -> API -> service_role)
-- Hoặc SUPABASE_ANON_KEY nếu bucket public
