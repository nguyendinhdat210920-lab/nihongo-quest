/**
 * Chuẩn hoá thẻ flashcard để dùng chung cho Học / Kiểm tra.
 * Một lần tạo thẻ (front/back/example + tuỳ chọn hiragana + choices) → nhiều chế độ.
 */
import { parseFrontDisplay } from "@/lib/speakText";

/** Dữ liệu thẻ từ API (khớp backend sau migration) */
export interface FlashCardModel {
  id: number;
  deckId: number;
  front: string;
  back: string;
  example: string;
  learned: boolean;
  hiragana?: string;
  choices?: string[];
}

/** Thẻ đã tách kanji / đọc / nghĩa — dễ dùng trong UI học & test */
export interface NormalizedCard {
  id: number;
  kanji: string | null;
  /** Cách đọc chính (ưu tiên Hiragana lưu DB, không thì parse từ front) */
  reading: string;
  meaning: string;
  example: string;
  /** Các đáp án nhiễu (nghĩa sai) user đã lưu khi tạo thẻ */
  savedWrongMeanings: string[];
}

export function normalizeCard(c: FlashCardModel): NormalizedCard {
  const { reading, kanji } = parseFrontDisplay(c.front);
  const readingLine = (c.hiragana?.trim() || reading || "").trim();
  return {
    id: c.id,
    kanji,
    reading: readingLine,
    meaning: (c.back || "").trim(),
    example: c.example || "",
    savedWrongMeanings: Array.isArray(c.choices) ? c.choices.filter(Boolean) : [],
  };
}

/** Xáo trộn mảng (Fisher–Yates) — dùng cho câu hỏi ngẫu nhiên */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tạo đáp án nhiễu cho câu hỏi “chọn nghĩa đúng”.
 * Ưu tiên nghĩa của thẻ khác trong deck; thêm từ savedWrongMeanings nếu thiếu.
 */
export function meaningDistractors(target: NormalizedCard, all: NormalizedCard[], need = 3): string[] {
  const out: string[] = [];
  const pool = shuffle(
    all.filter((x) => x.id !== target.id && x.meaning).map((x) => x.meaning)
  );
  for (const m of pool) {
    if (!answersMatch(m, target.meaning) && !out.includes(m)) out.push(m);
    if (out.length >= need) break;
  }
  for (const w of target.savedWrongMeanings) {
    if (out.length >= need) break;
    if (w && !answersMatch(w, target.meaning) && !out.includes(w)) out.push(w);
  }
  return out.slice(0, need);
}

/** So khớp đáp án gõ tay (bỏ khoảng thừa, không phân biệt hoa thường) */
export function answersMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .normalize("NFKC");
  return norm(a) === norm(b);
}

/** Đáp án nhiễu cho câu “chọn kanji đúng” (đọc + nghĩa gợi ý) */
export function kanjiDistractors(target: NormalizedCard, all: NormalizedCard[], need = 3): string[] {
  const out: string[] = [];
  const pool = shuffle(
    all.filter((x) => x.id !== target.id && x.kanji).map((x) => x.kanji as string)
  );
  const tk = target.kanji || "";
  for (const k of pool) {
    if (k && k !== tk && !out.includes(k)) out.push(k);
    if (out.length >= need) break;
  }
  return out.slice(0, need);
}
