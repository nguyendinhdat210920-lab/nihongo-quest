-- Thêm quiz cho từ vựng Bài 2 + Bài 3 (Nhật 1)
-- Gồm 1 quiz với nhiều câu hỏi trắc nghiệm.
-- Chạy trong Supabase SQL Editor.

DO $$
DECLARE
  quiz_id_var INT;
BEGIN
  -- Tạo quiz mới
  INSERT INTO quizzes (title, description, creator_name, question_count)
  VALUES (
    'Nhật 1 - Bài 2 + 3 - Từ vựng',
    'Quiz ôn tập từ vựng bài 2 \"休みの後で\" và bài 3 \"今度の休みに\"',
    'system',
    14
  )
  RETURNING id INTO quiz_id_var;

  -- Câu hỏi (mỗi câu: tiếng Nhật -> nghĩa tiếng Việt)
  INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES

  -- Bài 2
  (quiz_id_var, '今朝（けさ） nghĩa là gì?', 'Tối nay', 'Năm nay', 'Sáng nay', 'Sang năm', 'C'),
  (quiz_id_var, '晩ご飯（ばんごはん） nghĩa là gì?', 'Bữa sáng', 'Cơm tối', 'Mì ramen', 'Bữa trưa', 'B'),
  (quiz_id_var, '忙しい（いそがしい） nghĩa là gì?', 'Rảnh rỗi', 'Buồn', 'Bận', 'Vui vẻ', 'C'),
  (quiz_id_var, '気持ちがいい（きもちがいい） nghĩa là gì?', 'Cảm thấy buồn', 'Cảm thấy sảng khoái', 'Cảm thấy mệt', 'Cảm thấy đói', 'B'),
  (quiz_id_var, '温泉（おんせん）に入ります。 nghĩa là gì?', 'Đi học', 'Đi làm', 'Đi xem phim', 'Tắm suối nước nóng', 'D'),

  -- Bài 3
  (quiz_id_var, '今度（こんど） nghĩa là gì?', 'Lần trước', 'Lần tới', 'Ngay bây giờ', 'Lâu rồi', 'B'),
  (quiz_id_var, '来年（らいねん） nghĩa là gì?', 'Năm ngoái', 'Tháng sau', 'Sang năm', 'Năm nay', 'C'),
  (quiz_id_var, '自転車（じてんしゃ） nghĩa là gì?', 'Xe hơi', 'Xe đạp', 'Tàu điện', 'Xe buýt', 'B'),
  (quiz_id_var, '写真（しゃしん） nghĩa là gì?', 'Thư', 'Tranh', 'Ảnh', 'Sách', 'C'),
  (quiz_id_var, '撮ります［撮る］（とります） nghĩa là gì?', 'Nghe', 'Đọc', 'Chụp (ảnh)', 'Viết', 'C'),
  (quiz_id_var, '借ります［借りる］（かります） nghĩa là gì?', 'Cho mượn', 'Trả lại', 'Mua', 'Vay, mượn', 'D'),
  (quiz_id_var, 'ほしい nghĩa là gì?', 'Không cần', 'Không biết', 'Muốn có', 'Không thích', 'C'),
  (quiz_id_var, '好き（な）（すき） nghĩa là gì?', 'Buồn', 'Thích', 'Đói', 'Ghét', 'B'),
  (quiz_id_var, '嫌い（な）（きらい） nghĩa là gì?', 'Yêu', 'Cao', 'Ghét', 'Mệt', 'C');

  RAISE NOTICE 'Đã tạo quiz Nhật 1 Bài 2 + 3 với id = %', quiz_id_var;
END $$;

