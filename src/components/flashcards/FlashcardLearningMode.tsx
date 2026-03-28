/**
 * Chế độ Học: mỗi thẻ 2 bước — (1) trắc nghiệm nghĩa (2) gõ lại cách đọc (hiragana).
 */
import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import type { FlashCardModel } from "@/lib/flashcardLearnUtils";
import {
  normalizeCard,
  shuffle,
  meaningDistractors,
  answersMatch,
  type NormalizedCard,
} from "@/lib/flashcardLearnUtils";

type Phase = "mcq" | "type" | "done";

interface Props {
  cards: FlashCardModel[];
  maxCards?: number;
  onBack: () => void;
}

export default function FlashcardLearningMode({ cards, maxCards = 20, onBack }: Props) {
  const normalized = useMemo(() => cards.map(normalizeCard), [cards]);
  const queue = useMemo(() => {
    const cap = Math.min(maxCards, normalized.length);
    return shuffle([...normalized]).slice(0, cap);
  }, [normalized, maxCards]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("mcq");
  const [mcqPicked, setMcqPicked] = useState<string | null>(null);
  const [typeValue, setTypeValue] = useState("");
  const [typeChecked, setTypeChecked] = useState<"idle" | "ok" | "bad">("idle");
  /** Số thẻ đã hoàn thành cả 2 bước (gõ đọc đúng) */
  const [completedCount, setCompletedCount] = useState(0);

  const current: NormalizedCard | undefined = queue[index];

  const mcqOptions = useMemo(() => {
    if (!current) return [];
    const wrong = meaningDistractors(current, normalized, 3);
    const opts = shuffle([current.meaning, ...wrong].filter(Boolean));
    return opts;
  }, [current, normalized]);

  const resetSession = () => {
    setIndex(0);
    setPhase("mcq");
    setMcqPicked(null);
    setTypeValue("");
    setTypeChecked("idle");
    setCompletedCount(0);
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
