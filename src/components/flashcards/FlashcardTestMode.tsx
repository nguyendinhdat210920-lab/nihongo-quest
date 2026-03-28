/**
 * Chế độ Kiểm tra: cấu hình số câu + loại câu hỏi → làm bài → điểm + xem lại.
 */
import { useMemo, useState } from "react";
import { ChevronLeft, ClipboardList } from "lucide-react";
import type { FlashCardModel } from "@/lib/flashcardLearnUtils";
import {
  normalizeCard,
  shuffle,
  meaningDistractors,
  answersMatch,
  type NormalizedCard,
} from "@/lib/flashcardLearnUtils";

type QType = "mcq_meaning" | "fill_reading" | "write_kanji";

interface TestQuestion {
  type: QType;
  card: NormalizedCard;
  options?: string[];
}

type Screen = "setup" | "run" | "result";

interface Props {
  cards: FlashCardModel[];
  onBack: () => void;
}

export default function FlashcardTestMode({ cards, onBack }: Props) {
  const normalized = useMemo(() => cards.map(normalizeCard), [cards]);
  const maxQ = normalized.length;

  const [screen, setScreen] = useState<Screen>("setup");
  const [numQuestions, setNumQuestions] = useState(Math.min(10, maxQ || 1));
  const [useMcq, setUseMcq] = useState(true);
  const [useFill, setUseFill] = useState(true);
  const [useKanji, setUseKanji] = useState(true);

  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [input, setInput] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const buildQuestions = (): TestQuestion[] => {
    const types: QType[] = [];
    if (useMcq) types.push("mcq_meaning");
    if (useFill) types.push("fill_reading");
    if (useKanji) types.push("write_kanji");
    if (!types.length) return [];

    const pool = shuffle([...normalized]);
    const out: TestQuestion[] = [];
    let i = 0;
    let guard = 0;
    while (out.length < numQuestions && guard < 400) {
      guard++;
      const card = pool[i % pool.length];
      const t = types[i % types.length];
      i++;
      if (t === "write_kanji" && !card.kanji) continue;

      if (t === "mcq_meaning") {
        const wrong = meaningDistractors(card, normalized, 3);
        if (wrong.length < 1) continue;
        out.push({
          type: t,
          card,
          options: shuffle([card.meaning, ...wrong]),
        });
      } else {
        out.push({ type: t, card });
      }
      if (out.length >= numQuestions) break;
    }
    return out.slice(0, numQuestions);
  };

  const startTest = () => {
    const qs = buildQuestions();
    if (!qs.length) return;
    setQuestions(qs);
    setAnswers([]);
    setQIndex(0);
    setInput("");
    setPicked(null);
    setScreen("run");
  };

  const current = questions[qIndex];

  const submitMcq = () => {
    if (!picked || !current) return;
    const ok = answersMatch(picked, current.card.meaning);
    setAnswers((a) => [...a, ok]);
    setPicked(null);
    setInput("");
    if (qIndex >= questions.length - 1) setScreen("result");
    else setQIndex((x) => x + 1);
  };

  const submitFill = () => {
    if (!current) return;
    const ok = answersMatch(input, current.card.reading);
    setAnswers((a) => [...a, ok]);
    setInput("");
    if (qIndex >= questions.length - 1) setScreen("result");
    else setQIndex((x) => x + 1);
  };

  const submitKanji = () => {
    if (!current || !current.card.kanji) return;
    const ok = answersMatch(input, current.card.kanji);
    setAnswers((a) => [...a, ok]);
    setInput("");
    if (qIndex >= questions.length - 1) setScreen("result");
    else setQIndex((x) => x + 1);
  };

  const score = answers.filter(Boolean).length;

  if (!maxQ) {
    return (
      <div className="max-w-lg mx-auto glass-card p-8 text-center rounded-2xl border">
        <p className="text-muted-foreground mb-4">Chưa có thẻ trong deck.</p>
        <button type="button" onClick={onBack} className="text-primary text-sm hover:underline">
          Quay lại
        </button>
      </div>
    );
  }

  if (screen === "setup") {
    return (
      <div className="max-w-md mx-auto glass-card p-6 rounded-2xl border space-y-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="text-primary shrink-0" size={22} />
            Thiết lập bài kiểm tra
          </h3>
        </div>

        <div className="flex items-center justify-between gap-4 py-2 border-b border-border/60">
          <span className="text-sm">Câu hỏi (tối đa {maxQ})</span>
          <input
            type="number"
            min={1}
            max={maxQ}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Math.max(1, Math.min(maxQ, Number(e.target.value) || 1)))}
            className="w-20 px-2 py-1.5 rounded-lg border bg-muted text-sm text-center"
          />
        </div>

        <p className="text-xs text-muted-foreground">Chọn dạng câu (có thể bật nhiều loại):</p>
        <div className="space-y-2">
          {[
            { on: useMcq, set: setUseMcq, label: "Trắc nghiệm (chọn nghĩa)" },
            { on: useFill, set: setUseFill, label: "Điền đáp án (gõ cách đọc)" },
            { on: useKanji, set: setUseKanji, label: "Viết Kanji (có Kanji mới ra)" },
          ].map((row) => (
            <label
              key={row.label}
              className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/50"
            >
              <span className="text-sm">{row.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={row.on}
                onClick={() => row.set(!row.on)}
                className={`relative w-11 h-6 rounded-full transition-colors ${row.on ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${row.on ? "translate-x-5" : ""}`}
                />
              </button>
            </label>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="flex-1 py-2.5 rounded-xl border text-sm hover:bg-muted">
            Hủy
          </button>
          <button
            type="button"
            onClick={startTest}
            disabled={!useMcq && !useFill && !useKanji}
            className="flex-1 py-2.5 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            Bắt đầu làm kiểm tra
          </button>
        </div>
      </div>
    );
  }

  if (screen === "result") {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto glass-card p-8 rounded-2xl border text-center space-y-4">
        <div className="text-4xl">📊</div>
        <h3 className="text-xl font-bold">Kết quả</h3>
        <p className="text-2xl font-semibold text-primary">
          {score} / {questions.length} ({pct}%)
        </p>
        <p className="text-sm text-muted-foreground">
          {pct >= 80 ? "Rất tốt!" : pct >= 50 ? "Khá ổn, ôn thêm nhé." : "Cố gắng lần sau!"}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button type="button" onClick={() => setScreen("setup")} className="px-4 py-2.5 rounded-xl border hover:bg-muted text-sm">
            Làm lại
          </button>
          <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl gradient-bg text-primary-foreground text-sm font-medium">
            Quay lại deck
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setScreen("setup")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} /> Thoát
        </button>
        <span className="text-xs text-muted-foreground">
          Câu {qIndex + 1} / {questions.length}
        </span>
      </div>

      {current.type === "mcq_meaning" && (
        <div className="glass-card p-6 rounded-2xl border space-y-4">
          <p className="text-xs text-primary font-medium uppercase">Trắc nghiệm</p>
          <div className="text-center py-2 space-y-1">
            {current.card.kanji && <p className="font-jp text-3xl font-bold">{current.card.kanji}</p>}
            <p className="font-jp text-xl text-muted-foreground">{current.card.reading}</p>
          </div>
          <p className="text-sm text-muted-foreground">Chọn nghĩa đúng:</p>
          <div className="grid gap-2">
            {(current.options || []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPicked(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                  picked === opt ? "ring-2 ring-primary border-primary" : "hover:bg-muted"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!picked}
            onClick={submitMcq}
            className="w-full py-3 rounded-xl gradient-bg text-primary-foreground font-medium disabled:opacity-50"
          >
            Trả lời
          </button>
        </div>
      )}

      {current.type === "fill_reading" && (
        <div className="glass-card p-6 rounded-2xl border space-y-4">
          <p className="text-xs text-primary font-medium uppercase">Điền đáp án</p>
          {current.card.kanji && <p className="font-jp text-3xl font-bold text-center">{current.card.kanji}</p>}
          <p className="text-center text-sm text-muted-foreground">Nghĩa: {current.card.meaning}</p>
          <p className="text-sm">Gõ <strong>cách đọc</strong> (hiragana):</p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-background font-jp text-lg"
            placeholder="..."
          />
          <button
            type="button"
            onClick={submitFill}
            className="w-full py-3 rounded-xl gradient-bg text-primary-foreground font-medium"
          >
            Nộp
          </button>
        </div>
      )}

      {current.type === "write_kanji" && current.card.kanji && (
        <div className="glass-card p-6 rounded-2xl border space-y-4">
          <p className="text-xs text-primary font-medium uppercase">Viết Kanji</p>
          <p className="font-jp text-2xl text-center">{current.card.reading}</p>
          <p className="text-center text-sm text-muted-foreground">{current.card.meaning}</p>
          <p className="text-sm">Gõ <strong>chữ Kanji</strong> tương ứng:</p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-background font-jp text-2xl text-center"
            placeholder="Kanji"
          />
          <button
            type="button"
            onClick={submitKanji}
            className="w-full py-3 rounded-xl gradient-bg text-primary-foreground font-medium"
          >
            Nộp
          </button>
        </div>
      )}
    </div>
  );
}
