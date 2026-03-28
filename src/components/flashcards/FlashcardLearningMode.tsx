/**
 * Chế độ Học: mỗi thẻ 2 bước — (1) trắc nghiệm nghĩa (2) gõ lại cách đọc (hiragana).
 * Tiến độ lưu trong localStorage theo deckId (xem flashcardProgressStorage.ts).
 */
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import type { FlashCardModel } from "@/lib/flashcardLearnUtils";
import {
  normalizeCard,
  shuffle,
  meaningDistractors,
  answersMatch,
  type NormalizedCard,
} from "@/lib/flashcardLearnUtils";
import { clearLearnProgress, loadLearnProgress, saveLearnProgress } from "@/lib/flashcardProgressStorage";

type Phase = "mcq" | "type" | "done";

interface Props {
  cards: FlashCardModel[];
  deckId: number;
  maxCards?: number;
  onBack: () => void;
}

export default function FlashcardLearningMode({ cards, deckId, maxCards = 20, onBack }: Props) {
  /** Khi danh sách id thẻ đổi → phiên mới (không dùng ref cards để tránh reset do re-render) */
  const fingerprint = useMemo(
    () =>
      [...cards]
        .map((c) => c.id)
        .sort((a, b) => a - b)
        .join(","),
    [cards],
  );

  const [queue, setQueue] = useState<NormalizedCard[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("mcq");
  const [mcqPicked, setMcqPicked] = useState<string | null>(null);
  const [typeValue, setTypeValue] = useState("");
  const [typeChecked, setTypeChecked] = useState<"idle" | "ok" | "bad">("idle");
  const [completedCount, setCompletedCount] = useState(0);
  const [resumeNotice, setResumeNotice] = useState(false);

  useLayoutEffect(() => {
    if (!cards.length) {
      setQueue([]);
      return;
    }
    const normalized = cards.map(normalizeCard);
    const idSet = new Set(normalized.map((n) => n.id));
    const saved = loadLearnProgress(deckId);
    const map = new Map(normalized.map((n) => [n.id, n]));

    const freshQueue = () => {
      const cap = Math.min(maxCards, normalized.length);
      return shuffle([...normalized]).slice(0, cap);
    };

    let fromSave = false;
    if (saved && saved.queueIds.length > 0 && saved.queueIds.every((id) => idSet.has(id))) {
      const rebuilt = saved.queueIds.map((id) => map.get(id)).filter(Boolean) as NormalizedCard[];
      if (rebuilt.length === saved.queueIds.length) {
        setQueue(rebuilt);
        setIndex(Math.min(saved.index, Math.max(0, rebuilt.length - 1)));
        setPhase(saved.phase === "type" ? "type" : "mcq");
        setCompletedCount(Math.min(saved.completedCount, rebuilt.length));
        fromSave = true;
      } else {
        const q = freshQueue();
        setQueue(q);
        setIndex(0);
        setPhase("mcq");
        setCompletedCount(0);
      }
    } else {
      const q = freshQueue();
      setQueue(q);
      setIndex(0);
      setPhase("mcq");
      setCompletedCount(0);
    }

    setMcqPicked(null);
    setTypeValue("");
    setTypeChecked("idle");
    setResumeNotice(fromSave);
    // fingerprint đại diện cho nội dung bộ thẻ; cards lấy từ closure mới nhất khi fingerprint đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ reset khi deck / bộ id thẻ đổi
  }, [deckId, fingerprint, maxCards]);

  useEffect(() => {
    if (!resumeNotice) return;
    const t = window.setTimeout(() => setResumeNotice(false), 5000);
    return () => clearTimeout(t);
  }, [resumeNotice]);

  /** Lưu nhẹ sau mỗi thay đổi (đóng tab / đổi chế độ vẫn còn tiến độ) */
  useEffect(() => {
    if (!queue.length || phase === "done") return;
    const h = window.setTimeout(() => {
      saveLearnProgress(deckId, {
        queueIds: queue.map((c) => c.id),
        index,
        phase: phase === "mcq" || phase === "type" ? phase : "mcq",
        completedCount,
      });
    }, 400);
    return () => clearTimeout(h);
  }, [deckId, queue, index, phase, completedCount]);

  useEffect(() => {
    if (phase === "done") clearLearnProgress(deckId);
  }, [deckId, phase]);

  const current: NormalizedCard | undefined = queue[index];

  const mcqOptions = useMemo(() => {
    if (!current) return [];
    const wrong = meaningDistractors(current, cards.map(normalizeCard), 3);
    const opts = shuffle([current.meaning, ...wrong].filter(Boolean));
    return opts;
  }, [current, cards]);

  const resetSession = () => {
    clearLearnProgress(deckId);
    const normalized = cards.map(normalizeCard);
    const cap = Math.min(maxCards, normalized.length);
    setQueue(shuffle([...normalized]).slice(0, cap));
    setIndex(0);
    setPhase("mcq");
    setMcqPicked(null);
    setTypeValue("");
    setTypeChecked("idle");
    setCompletedCount(0);
    setResumeNotice(false);
  };

  if (!queue.length) {
    return (
      <div className="max-w-lg mx-auto glass-card p-8 text-center rounded-2xl border">
        <p className="text-muted-foreground mb-4">Deck chưa có thẻ để học.</p>
        <button type="button" onClick={onBack} className="text-primary hover:underline text-sm">
          Quay lại
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="max-w-lg mx-auto glass-card p-8 text-center rounded-2xl border">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="font-semibold text-lg mb-2">Xong phiên học</h3>
        <p className="text-muted-foreground mb-6">
          Hoàn thành {completedCount} / {queue.length} thẻ (đã gõ đúng cách đọc).
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={resetSession}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border hover:bg-muted"
          >
            <RotateCcw size={18} /> Học lại
          </button>
          <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl gradient-bg text-primary-foreground font-medium">
            Quay lại deck
          </button>
        </div>
      </div>
    );
  }

  const advanceAfterType = () => {
    setCompletedCount((c) => c + 1);
    if (index >= queue.length - 1) {
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
      setPhase("mcq");
      setMcqPicked(null);
      setTypeValue("");
      setTypeChecked("idle");
    }
  };

  const handleMcq = (opt: string) => {
    if (mcqPicked) return;
    setMcqPicked(opt);
    if (answersMatch(opt, current!.meaning)) {
      setPhase("type");
    }
  };

  const handleCheckType = () => {
    if (!current) return;
    if (answersMatch(typeValue, current.reading)) {
      setTypeChecked("ok");
    } else {
      setTypeChecked("bad");
    }
  };

  const handleNextFromType = () => {
    if (typeChecked !== "ok") return;
    advanceAfterType();
  };

  const handleSkipMcqAfterWrong = () => {
    setMcqPicked(null);
    setPhase("type");
    setTypeValue("");
    setTypeChecked("idle");
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} /> Thoát học
        </button>
        <span className="text-xs text-muted-foreground">
          Thẻ {index + 1} / {queue.length}
        </span>
      </div>

      {resumeNotice && (
        <p className="text-xs text-center text-primary bg-primary/10 rounded-lg py-2 px-3">
          Đã khôi phục tiến độ lần học trước trên trình duyệt này.
        </p>
      )}

      {phase === "mcq" && current && (
        <div className="glass-card p-6 rounded-2xl border space-y-4">
          <p className="text-xs font-medium text-primary uppercase tracking-wide">Bước 1 — Trắc nghiệm</p>
          <p className="text-sm text-muted-foreground">Chọn nghĩa đúng cho từ sau:</p>
          <div className="text-center py-4 space-y-1">
            {current.kanji && <p className="font-jp text-4xl font-bold">{current.kanji}</p>}
            <p className="font-jp text-2xl text-muted-foreground">{current.reading}</p>
          </div>
          <div className="grid gap-2">
            {mcqOptions.map((opt) => {
              const picked = mcqPicked === opt;
              const correct = answersMatch(opt, current.meaning);
              let cls = "w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ";
              if (!mcqPicked) cls += "hover:bg-muted";
              else if (correct) cls += "bg-emerald-500/20 border-emerald-500";
              else if (picked) cls += "bg-destructive/15 border-destructive";
              else cls += "opacity-50";
              return (
                <button key={opt} type="button" disabled={!!mcqPicked} className={cls} onClick={() => handleMcq(opt)}>
                  {opt}
                </button>
              );
            })}
          </div>
          {mcqPicked && !answersMatch(mcqPicked, current.meaning) && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Chưa đúng. Đáp án: {current.meaning}</p>
              <button
                type="button"
                onClick={handleSkipMcqAfterWrong}
                className="text-sm text-primary hover:underline"
              >
                Sang bước 2 — gõ cách đọc
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "type" && current && (
        <div className="glass-card p-6 rounded-2xl border space-y-4">
          <p className="text-xs font-medium text-primary uppercase tracking-wide">Bước 2 — Tự luận</p>
          <p className="text-sm text-muted-foreground">
            Gõ <strong>hiragana / cách đọc</strong> của từ (giống mặt trước thẻ).
          </p>
          {current.kanji && <p className="font-jp text-3xl font-bold text-center">{current.kanji}</p>}
          <p className="text-center text-sm text-muted-foreground">Nghĩa: {current.meaning}</p>
          <input
            value={typeValue}
            onChange={(e) => {
              setTypeValue(e.target.value);
              setTypeChecked("idle");
            }}
            className="w-full px-4 py-3 rounded-xl border bg-background font-jp text-lg"
            placeholder="Nhập cách đọc..."
            disabled={typeChecked === "ok"}
          />
          {typeChecked === "bad" && (
            <p className="text-sm text-destructive">Chưa khớp. Gợi ý: {current.reading}</p>
          )}
          {typeChecked === "ok" && <p className="text-sm text-emerald-600 dark:text-emerald-400">Chính xác!</p>}
          <div className="flex gap-2">
            {typeChecked !== "ok" && (
              <button type="button" onClick={handleCheckType} className="flex-1 py-3 rounded-xl gradient-bg text-primary-foreground font-medium">
                Kiểm tra
              </button>
            )}
            {typeChecked === "ok" && (
              <button type="button" onClick={handleNextFromType} className="flex-1 py-3 rounded-xl gradient-bg text-primary-foreground font-medium">
                {index >= queue.length - 1 ? "Kết thúc" : "Thẻ tiếp theo"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
