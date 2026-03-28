/**
 * Lưu tiến độ Flashcard trên trình duyệt (localStorage).
 * Không cần server — mỗi máy / trình duyệt một bản; xóa cache web là mất.
 */

const PREFIX_LEARN = "ihq_flash_learn_v1_";
const PREFIX_MEMO = "ihq_flash_memo_v1_";

export type LearnProgressV1 = {
  v: 1;
  queueIds: number[];
  index: number;
  phase: "mcq" | "type";
  completedCount: number;
  updatedAt: number;
};

export type MemoProgressV1 = {
  v: 1;
  currentCard: number;
  studyFilter: "all" | "needReview";
  updatedAt: number;
};

export function loadLearnProgress(deckId: number): LearnProgressV1 | null {
  try {
    const raw = localStorage.getItem(PREFIX_LEARN + deckId);
    if (!raw) return null;
    const p = JSON.parse(raw) as LearnProgressV1;
    if (p.v !== 1 || !Array.isArray(p.queueIds)) return null;
    if (typeof p.index !== "number" || p.index < 0) return null;
    if (p.phase !== "mcq" && p.phase !== "type") return null;
    if (typeof p.completedCount !== "number" || p.completedCount < 0) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveLearnProgress(deckId: number, data: Omit<LearnProgressV1, "v" | "updatedAt"> & { v?: 1 }) {
  try {
    const payload: LearnProgressV1 = {
      v: 1,
      queueIds: data.queueIds,
      index: data.index,
      phase: data.phase,
      completedCount: data.completedCount,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PREFIX_LEARN + deckId, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearLearnProgress(deckId: number) {
  try {
    localStorage.removeItem(PREFIX_LEARN + deckId);
  } catch {
    /* ignore */
  }
}

export function loadMemoProgress(deckId: number): MemoProgressV1 | null {
  try {
    const raw = localStorage.getItem(PREFIX_MEMO + deckId);
    if (!raw) return null;
    const p = JSON.parse(raw) as MemoProgressV1;
    if (p.v !== 1) return null;
    if (p.studyFilter !== "all" && p.studyFilter !== "needReview") return null;
    if (typeof p.currentCard !== "number" || p.currentCard < 0) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveMemoProgress(deckId: number, currentCard: number, studyFilter: "all" | "needReview") {
  try {
    const payload: MemoProgressV1 = {
      v: 1,
      currentCard,
      studyFilter,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PREFIX_MEMO + deckId, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}
