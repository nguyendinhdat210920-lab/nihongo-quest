-- Thêm từ vựng bài 2 "休みの後で" vào một deck flashcard
-- Chạy trong Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor
-- Nếu deck của bạn có tên khác, sửa 'Bài 2 休みの後で' ở dòng dưới cho đúng với title của deck.

DO $$
DECLARE
  deck_id_var INT;
BEGIN
  -- Tìm deck theo title (có thể chỉnh sửa cho khớp với deck của bạn)
  SELECT id
  INTO deck_id_var
  FROM decks
  WHERE title ILIKE '%Bài 2 休みの後で%' OR title ILIKE '%Bai 2 Yasumi no ato%'
  LIMIT 1;
  
  IF deck_id_var IS NULL THEN
    RAISE NOTICE 'Deck "Bài 2 休みの後で" không tìm thấy. Vui lòng tạo deck trước hoặc sửa tên trong script.';
    RETURN;
  END IF;

  INSERT INTO flashcards (deck_id, front, back, example, learned) VALUES
    (deck_id_var, '今朝（けさ）', 'Sáng nay', NULL, false),
    (deck_id_var, '先月（せんげつ）', 'Tháng trước', NULL, false),
    (deck_id_var, '去年（きょねん）', 'Năm ngoái', NULL, false),
    (deck_id_var, '風邪（かぜ）', 'Cảm cúm', NULL, false),
    (deck_id_var, '天気（てんき）', 'Thời tiết', NULL, false),
    (deck_id_var, '晩ご飯（ばんごはん）', 'Cơm tối', NULL, false),
    (deck_id_var, '服（ふく）', 'Quần áo', NULL, false),
    (deck_id_var, '登ります（のぼります）', 'Leo, trèo', NULL, false),
    (deck_id_var, '入ります（はいります）', 'Vào / Bước vào', NULL, false),
    (deck_id_var, '温泉（おんせん）に入ります。', 'Tắm suối nước nóng', NULL, false),
    (deck_id_var, '忙しい（いそがしい）', 'Bận', NULL, false),
    (deck_id_var, 'おもしろい', 'Thú vị, hay, hấp dẫn', NULL, false),
    (deck_id_var, '気持ちがいい（きもちがいい）', 'Cảm thấy sảng khoái', NULL, false),
    (deck_id_var, '高い（たかい）', 'Cao, đắt', NULL, false);

  RAISE NOTICE 'Đã thêm % thẻ vào deck bài 2 "休みの後で" (id: %)', 14, deck_id_var;
END $$;

