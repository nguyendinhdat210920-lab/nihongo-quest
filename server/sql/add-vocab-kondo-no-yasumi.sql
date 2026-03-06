-- Thêm từ vựng bài 3 "今度の休みに" vào một deck flashcard
-- Chạy trong Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor
-- Nếu deck của bạn có tên khác, sửa 'Bài 3 今度の休みに' ở dòng dưới cho đúng với title của deck.

DO $$
DECLARE
  deck_id_var INT;
BEGIN
  -- Tìm deck theo title (có thể chỉnh sửa cho khớp với deck của bạn)
  SELECT id
  INTO deck_id_var
  FROM decks
  WHERE title ILIKE '%Bài 3 今度の休みに%' OR title ILIKE '%Bai 3 Kondo no yasumi%'
  LIMIT 1;
  
  IF deck_id_var IS NULL THEN
    RAISE NOTICE 'Deck \"Bài 3 今度の休みに\" không tìm thấy. Vui lòng tạo deck trước hoặc sửa tên trong script.';
    RETURN;
  END IF;

  INSERT INTO flashcards (deck_id, front, back, example, learned) VALUES
    (deck_id_var, '今度（こんど）', 'Lần tới', NULL, false),
    (deck_id_var, '今晩（こんばん）', 'Tối nay', NULL, false),
    (deck_id_var, '今年（ことし）', 'Năm nay', NULL, false),
    (deck_id_var, '来年（らいねん）', 'Sang năm', NULL, false),
    (deck_id_var, 'アニメ', 'Hoạt hình', NULL, false),
    (deck_id_var, '絵（え）', 'Tranh', NULL, false),
    (deck_id_var, '景色（けしき）', 'Phong cảnh', NULL, false),
    (deck_id_var, '自転車（じてんしゃ）', 'Xe đạp', NULL, false),
    (deck_id_var, '写真（しゃしん）', 'Ảnh', NULL, false),
    (deck_id_var, '撮ります［撮る］（とります）', 'Chụp', NULL, false),
    (deck_id_var, '借ります［借りる］（かります）', 'Vay, mượn', NULL, false),
    (deck_id_var, 'ほしい', 'Muốn có', NULL, false),
    (deck_id_var, '好き（な）（すき）', 'Thích', NULL, false),
    (deck_id_var, '嫌い（な）（きらい）', 'Ghét', NULL, false);

  RAISE NOTICE 'Đã thêm % thẻ vào deck bài 3 \"今度の休みに\" (id: %)', 14, deck_id_var;
END $$;

