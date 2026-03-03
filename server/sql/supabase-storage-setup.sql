-- Tạo bucket "materials" trong Supabase Storage (file tài liệu không mất khi Render restart)
-- Chạy trong Supabase Dashboard: Storage -> New bucket

-- Hoặc dùng SQL trong SQL Editor (nếu có quyền):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true);

-- Cách thủ công:
-- 1. Vào Supabase Dashboard -> Storage
-- 2. New bucket -> Tên: materials
-- 3. Bật "Public bucket" (để xem/tải file)
-- 4. Create bucket

-- Sau đó thêm env vars trên Render:
-- SUPABASE_URL = https://YOUR_PROJECT.supabase.co
-- SUPABASE_SERVICE_ROLE_KEY = eyJ... (từ Settings -> API -> service_role)
-- Hoặc SUPABASE_ANON_KEY nếu bucket public
