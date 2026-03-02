-- Thêm từ vựng vào deck "Nhật 1"
-- Chạy trong Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor
-- Nếu deck của bạn có tên khác, sửa 'Nhật 1' ở dòng dưới

DO $$
DECLARE
  deck_id_var INT;
BEGIN
  SELECT id INTO deck_id_var FROM decks WHERE title ILIKE '%Nhật 1%' OR title ILIKE 'Nhat 1' LIMIT 1;
  
  IF deck_id_var IS NULL THEN
    RAISE NOTICE 'Deck "Nhật 1" không tìm thấy. Vui lòng tạo deck trước hoặc sửa tên trong script.';
    RETURN;
  END IF;

  INSERT INTO flashcards (deck_id, front, back, example, learned) VALUES
  (deck_id_var, 'ロシア', 'Nga', NULL, false),
  (deck_id_var, 'タイ', 'Thái Lan', NULL, false),
  (deck_id_var, '高校（こうこう）', 'Trường THPT', NULL, false),
  (deck_id_var, '大学（だいがく）', 'Trường đại học', NULL, false),
  (deck_id_var, '日本語学校（にほんごがっこう）', 'Trường tiếng Nhật', NULL, false),
  (deck_id_var, '（お）仕事（しごと）', 'Công việc', NULL, false),
  (deck_id_var, '学生（がくせい）', 'Học sinh', NULL, false),
  (deck_id_var, '先生（せんせい）', 'Thầy/Cô giáo', NULL, false),
  (deck_id_var, '教師（きょうし）', 'Giáo viên', NULL, false),
  (deck_id_var, '会社員（かいしゃいん）', 'Nhân viên văn phòng', NULL, false),
  (deck_id_var, '社員（しゃいん）', 'Nhân viên công ty', NULL, false),
  (deck_id_var, '～さん', 'Anh/Chị/Ông/Bà', NULL, false),
  (deck_id_var, '～人（～じん）', 'Người (nước nào)', NULL, false),
  (deck_id_var, 'どちら', 'Ở đâu / Phía nào', NULL, false),
  (deck_id_var, 'お国はどちらですか。', 'Đất nước của bạn là nước nào?', NULL, false),
  (deck_id_var, 'はじめまして', 'Xin chào (lần đầu gặp mặt)', NULL, false),
  (deck_id_var, '（どうぞ）よろしくお願いします', 'Rất mong được giúp đỡ', NULL, false),
  (deck_id_var, 'こちらこそ', 'Tôi cũng vậy', NULL, false);

  RAISE NOTICE 'Đã thêm 18 thẻ vào deck "Nhật 1" (id: %)', deck_id_var;
END $$;
