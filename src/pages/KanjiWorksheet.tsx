import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Download, Eraser, RefreshCcw, Sparkles, Undo2, Wand2 } from "lucide-react";
import { jsPDF } from "jspdf";

type Point = { x: number; y: number };
type Stroke = { points: Point[] };

const MAX_KANJI = 10;
const MAX_ROWS = 10;
const SUGGEST_LIMIT = 8;

const TOPICS: { id: string; label: string; kanji: string }[] = [
  { id: "n5-night", label: "Số đếm N5", kanji: "一二三四五六七八九十" },
  { id: "nature", label: "Thiên nhiên", kanji: "山川林海空雨雪風" },
  { id: "time", label: "Thời gian", kanji: "今日昨明年朝夜今" },
  { id: "people", label: "Con người", kanji: "人男女子父母兄弟姉妹" },
  { id: "place", label: "Địa điểm", kanji: "国町村駅店学校家" },
  { id: "verbs-n4", label: "Động từ N4", kanji: "見行来帰話聞買売" },
  { id: "adj-n4", label: "Tính từ N4", kanji: "高安早遅新古大小" },
  { id: "edu-n4", label: "Giáo dục N4", kanji: "学教書試験宿題" },
];

const sanitizeKanjiInput = (s: string) => {
  // Keep CJK + kana + spaces. Do NOT over-normalize here; IME composition needs raw value.
  return String(s || "").replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]/g, "");
};

const splitGlyphs = (s: string) => {
  // Split into codepoints; treat spaces as separators
  const out: string[] = [];
  for (const ch of s) {
    if (ch.trim() === "") continue;
    out.push(ch);
    if (out.length >= MAX_KANJI) break;
  }
  return out;
};

const toKanjiVgHex = (ch: string) => {
  const cp = ch.codePointAt(0);
  if (!cp) return null;
  // KanjiVG uses 5-digit lowercase hex (e.g., 04e00.svg)
  return cp.toString(16).padStart(5, "0");
};

function getCanvasPos(canvas: HTMLCanvasElement, e: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function drawWorksheetBase(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // margins
  const padding = 28;
  // header
  ctx.fillStyle = "#0F172A";
  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.fillText("Luyện viết Kanji", w / 2, padding + 32);

  ctx.fillStyle = "#64748B";
  ctx.font = "600 12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("A4 WORKSHEET", w / 2, padding + 52);

  ctx.fillStyle = "#334155";
  ctx.font = "400 12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "left";
  ctx.fillText("Họ và tên: ____________________", padding, padding + 70);
  ctx.textAlign = "right";
  ctx.fillText("Ngày: ____/____/______", w - padding, padding + 70);

  ctx.restore();
}

function drawRowGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number
) {
  ctx.save();
  // outer border
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // vertical lines
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  const cellW = w / cols;
  for (let c = 1; c < cols; c++) {
    const xx = x + c * cellW;
    ctx.beginPath();
    ctx.moveTo(xx, y);
    ctx.lineTo(xx, y + h);
    ctx.stroke();
  }

  // guidelines in each cell (diagonal + cross)
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  for (let c = 0; c < cols; c++) {
    const x0 = x + c * cellW;
    const x1 = x0 + cellW;
    const y0 = y;
    const y1 = y + h;
    const xc = x0 + cellW / 2;
    const yc = y0 + h / 2;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y0);
    ctx.lineTo(x0, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xc, y0);
    ctx.lineTo(xc, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0, yc);
    ctx.lineTo(x1, yc);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWorksheetRows(ctx: CanvasRenderingContext2D, w: number, h: number, glyphs: string[]) {
  const padding = 28;
  const topY = padding + 92;
  const bottomPad = padding;
  const usableH = Math.max(1, h - topY - bottomPad);

  const rows = Math.min(glyphs.length, MAX_ROWS);
  const rowGap = 12;
  const labelW = Math.min(64, Math.max(52, w * 0.08));
  const cols = 10;

  const rowH = rows > 0 ? Math.min(68, Math.max(46, (usableH - rowGap * (rows - 1)) / rows)) : 60;
  const gridW = w - padding * 2 - labelW;
  const cellW = gridW / cols;

  ctx.save();
  ctx.textAlign = "center";

  // font sizes based on row height
  const faintFont = Math.floor(Math.min(cellW, rowH) * 0.62);
  const labelFont = Math.floor(rowH * 0.70);
  const fontFamily = `"Yu Mincho","YuMincho","MS Mincho","Noto Serif JP",serif`;

  for (let r = 0; r < rows; r++) {
    const ch = glyphs[r];
    const y = topY + r * (rowH + rowGap);
    const labelX = padding + labelW / 2;
    const gridX = padding + labelW;

    // kanji label (left)
    ctx.fillStyle = "#0F172A";
    ctx.font = `700 ${labelFont}px ${fontFamily}`;
    ctx.textBaseline = "middle";
    ctx.fillText(ch, labelX, y + rowH / 2);

    // grid row
    drawRowGrid(ctx, gridX, y, gridW, rowH, cols);

    // faint guide in first 6 cells
    ctx.fillStyle = "rgba(2, 132, 199, 0.20)";
    ctx.font = `700 ${faintFont}px ${fontFamily}`;
    for (let c = 0; c < cols; c++) {
      const inGuide = c < 7; // like the screenshot: many guide boxes
      if (!inGuide) continue;
      const x = gridX + c * cellW + cellW / 2;
      const yy = y + rowH / 2 + rowH * 0.20;
      ctx.fillText(ch, x, yy);
    }
  }

  ctx.restore();
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.save();
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      const p = s.points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export default function KanjiWorksheet() {
  const [input, setInput] = useState("今玉交合歩茶弓雲算小");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStroke = useRef<Stroke | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const suggestTimerRef = useRef<number | null>(null);

  // Stroke order diagram cache (KanjiVG SVG rendered to <img>)
  const strokeImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [strokeImgTick, setStrokeImgTick] = useState(0);

  const inputGlyphs = useMemo(() => splitGlyphs(sanitizeKanjiInput(input)), [input]);
  const count = inputGlyphs.length;
  const glyphs = generated.length ? generated : [];

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawWorksheetBase(ctx, canvas.width, canvas.height);
    if (glyphs.length === 0) {
      ctx.save();
      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "center";
      ctx.fillText("Nhập Kanji hoặc chọn chủ đề", canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillText("rồi bấm “Tạo Worksheet” để xem trước.", canvas.width / 2, canvas.height / 2 + 14);
      ctx.restore();
    } else {
      drawWorksheetRows(ctx, canvas.width, canvas.height, glyphs);
    }

    // Stroke order diagrams (draw on top, small, above each row)
    if (glyphs.length > 0) {
      const padding = 28;
      const topY = padding + 92;
      const bottomPad = padding;
      const usableH = Math.max(1, canvas.height - topY - bottomPad);
      const rows = Math.min(glyphs.length, MAX_ROWS);
      const rowGap = 12;
      const labelW = Math.min(64, Math.max(52, canvas.width * 0.08));
      const rowH = rows > 0 ? Math.min(68, Math.max(46, (usableH - rowGap * (rows - 1)) / rows)) : 60;
      const gridX = padding + labelW;

      for (let r = 0; r < rows; r++) {
        const ch = glyphs[r];
        const img = strokeImgCacheRef.current.get(ch);
        if (!img) continue;
        // place in a small box above row grid, left-aligned
        const y = topY + r * (rowH + rowGap);
        const boxH = Math.max(18, Math.floor(rowH * 0.55));
        const boxW = boxH;
        const x = gridX + 6;
        const yy = Math.max(padding + 78, y - boxH - 6);
        try {
          ctx.drawImage(img, x, yy, boxW, boxH);
        } catch {
          // ignore draw errors
        }
      }
    }

    drawStrokes(ctx, strokes);
  };

  // Resize canvas for crisp rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      redraw();
    };

    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);
    window.addEventListener("resize", resize);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, glyphs.join("|"), strokeImgTick]);

  // Fetch Kanji stroke order SVGs (KanjiVG) for current glyphs
  useEffect(() => {
    const needed = glyphs.filter((g) => !strokeImgCacheRef.current.has(g));
    if (!needed.length) return;

    let cancelled = false;
    const loadOne = async (ch: string) => {
      const hex = toKanjiVgHex(ch);
      if (!hex) return;
      // Only for CJK Unified Ideographs range; skip kana
      const cp = ch.codePointAt(0) || 0;
      if (cp < 0x4e00 || cp > 0x9fff) return;

      const url = `https://kanjivg.tagaini.net/kanjivg/kanji/${hex}.svg`;
      try {
        const resp = await fetch(url, { cache: "force-cache" });
        if (!resp.ok) return;
        const svg = await resp.text();
        if (cancelled) return;
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const blobUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          URL.revokeObjectURL(blobUrl);
          if (cancelled) return;
          strokeImgCacheRef.current.set(ch, img);
          setStrokeImgTick((x) => x + 1);
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
        };
        img.src = blobUrl;
      } catch {
        // ignore
      }
    };

    // Fire and forget (small list)
    needed.slice(0, MAX_ROWS).forEach((ch) => {
      loadOne(ch);
    });

    return () => {
      cancelled = true;
    };
  }, [glyphs.join("|")]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      const p = getCanvasPos(canvas, e);
      currentStroke.current = { points: [p] };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawing || !currentStroke.current) return;
      const p = getCanvasPos(canvas, e);
      currentStroke.current.points.push(p);
      // draw incrementally
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pts = currentStroke.current.points;
      if (pts.length < 2) return;
      ctx.save();
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    };

    const finish = (_e: PointerEvent) => {
      if (!currentStroke.current) return;
      const stroke = currentStroke.current;
      currentStroke.current = null;
      setIsDrawing(false);
      if (stroke.points.length >= 2) {
        setStrokes((prev) => [...prev, stroke]);
      } else {
        redraw();
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", finish);
      canvas.removeEventListener("pointercancel", finish);
    };
  }, [isDrawing]);

  const applyTopic = (topicId: string) => {
    const t = TOPICS.find((x) => x.id === topicId);
    if (!t) return;
    setSelectedTopic(topicId);
    setInput(t.kanji.slice(0, MAX_KANJI));
    setGenerated([]);
  };

  const handleClear = () => setStrokes([]);
  const handleUndo = () => setStrokes((prev) => prev.slice(0, -1));
  const handleResetAll = () => {
    setInput("");
    setSelectedTopic(null);
    setGenerated([]);
    setStrokes([]);
    setSuggestions([]);
  };

  const handleGenerate = () => {
    setGenerated(inputGlyphs.slice(0, MAX_ROWS));
    setStrokes([]);
  };

  const handleCopy = async () => {
    const text = inputGlyphs.join("");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const exportPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = w - margin * 2;
    const imgH = (canvas.height / canvas.width) * imgW;
    const y = Math.max(margin, (h - imgH) / 2);

    const dataUrl = canvas.toDataURL("image/png", 1.0);
    pdf.addImage(dataUrl, "PNG", margin, y, imgW, imgH);
    pdf.save(`kanji-worksheet-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Kanji suggestions from Jisho (works for kana/kanji queries)
  useEffect(() => {
    if (isComposing) return;
    const q = sanitizeKanjiInput(input).trim();
    if (!q) {
      setSuggestions([]);
      return;
    }

    // Debounce
    if (suggestTimerRef.current) window.clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = window.setTimeout(async () => {
      try {
        suggestAbortRef.current?.abort();
        const ac = new AbortController();
        suggestAbortRef.current = ac;
        setSuggestLoading(true);

        // Query last token (use full string, but keep it short)
        const keyword = encodeURIComponent(q.slice(-20));
        const resp = await fetch(`https://jisho.org/api/v1/search/words?keyword=${keyword}`, { signal: ac.signal });
        if (!resp.ok) throw new Error("bad response");
        const data = await resp.json();
        const words: string[] = [];
        for (const item of data?.data || []) {
          const jp = item?.japanese?.[0];
          const w1 = jp?.word;
          const r1 = jp?.reading;
          if (typeof w1 === "string" && w1) words.push(w1);
          else if (typeof r1 === "string" && r1) words.push(r1);
          if (words.length >= SUGGEST_LIMIT) break;
        }
        setSuggestions([...new Set(words)].slice(0, SUGGEST_LIMIT));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 350);

    return () => {
      if (suggestTimerRef.current) window.clearTimeout(suggestTimerRef.current);
    };
  }, [input, isComposing]);

  const applySuggestion = (s: string) => {
    // Insert suggestion as full content (simpler + predictable)
    const g = splitGlyphs(sanitizeKanjiInput(s));
    setInput(g.join(""));
    setSelectedTopic(null);
    setGenerated([]);
    setStrokes([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-jp">Kanji Worksheet</h1>
          <p className="text-sm text-muted-foreground">Tạo worksheet A4 và luyện viết trực tiếp bằng chuột.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: controls */}
          <div className="space-y-6">
            <div className="glass-card p-6 border rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold">Nhập Kanji (tối đa {MAX_KANJI} ký tự)</label>
                <span className="text-xs text-muted-foreground">{count}/{MAX_KANJI}</span>
              </div>
              <textarea
                value={input}
                onChange={(e) => {
                  const nextRaw = e.target.value;
                  // IMPORTANT: do not mutate during IME composition
                  if (isComposing) {
                    setInput(nextRaw);
                    return;
                  }
                  const next = sanitizeKanjiInput(nextRaw);
                  const g = splitGlyphs(next);
                  setInput(g.join(""));
                  setSelectedTopic(null);
                  setGenerated([]);
                }}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={(e) => {
                  setIsComposing(false);
                  const next = sanitizeKanjiInput((e.target as HTMLTextAreaElement).value);
                  const g = splitGlyphs(next);
                  setInput(g.join(""));
                }}
                placeholder="Ví dụ: 山川花木"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none font-jp text-lg resize-none"
              />

              {/* Suggestions bar */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Gợi ý:</span>
                {suggestLoading && <span className="text-xs text-muted-foreground">đang tìm…</span>}
                {!suggestLoading && suggestions.length === 0 && (
                  <span className="text-xs text-muted-foreground">gõ hira/kata/kanji để xem gợi ý</span>
                )}
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-jp"
                    title="Chọn gợi ý"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={inputGlyphs.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl gradient-bg text-primary-foreground font-semibold disabled:opacity-60"
                >
                  <Wand2 size={18} /> Tạo Worksheet
                </button>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-4 py-3 rounded-xl border hover:bg-muted text-sm"
                  title="Làm lại"
                >
                  <RefreshCcw size={18} />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <button type="button" onClick={handleCopy} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Copy size={14} /> Copy Kanji
                </button>
                <span>•</span>
                <span>Mẹo: dán Kanji từ bài học/flashcard</span>
              </div>
            </div>

            <div className="glass-card p-6 border rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-primary" />
                <h2 className="font-semibold">Chủ đề</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => {
                  const active = selectedTopic === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => applyTopic(t.id)}
                      type="button"
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        active ? "gradient-bg text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Chọn chủ đề sẽ tự điền Kanji mẫu (bạn có thể sửa lại).</p>
            </div>

            <div className="glass-card p-6 border rounded-2xl">
              <h2 className="font-semibold mb-3">Viết bằng chuột</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-muted text-sm disabled:opacity-50"
                >
                  <Undo2 size={16} /> Undo
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={strokes.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-muted text-sm disabled:opacity-50"
                >
                  <Eraser size={16} /> Xóa nét
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Bạn viết trực tiếp lên phần xem trước. Nét viết sẽ được giữ và **tải kèm trong PDF**.
              </p>
            </div>
          </div>

          {/* Right: preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 border rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Xem trước Worksheet</h2>
                <p className="text-xs text-muted-foreground">A4 WORKSHEET</p>
              </div>
              <button
                type="button"
                onClick={exportPdf}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                disabled={glyphs.length === 0}
              >
                <Download size={16} /> Tải PDF
              </button>
            </div>
            <div className="rounded-xl border bg-white p-3 overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full aspect-[1/1.4142] rounded-lg touch-none"
                aria-label="Kanji worksheet canvas"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Bấm “Tạo Worksheet” để tạo hàng ô cho từng Kanji.</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

