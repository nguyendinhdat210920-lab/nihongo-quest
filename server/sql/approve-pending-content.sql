-- Duyệt bài học và tài liệu đang pending (để người khác thấy được)
-- Chạy trong Supabase SQL Editor nếu có nội dung pending

UPDATE lessons SET status = 'approved' WHERE status = 'pending';
UPDATE materials SET status = 'approved' WHERE status = 'pending';
