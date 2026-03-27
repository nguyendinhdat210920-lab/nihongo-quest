import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Eraser, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { jsPDF } from "jspdf";

type Point = { x: number; y: number };
type Stroke = { points: Point[] };

const MAX_KANJI = 10;

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
  // keep CJK + kana + basic punctuation/spaces, then collapse spaces
  const cleaned = s
    .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // remove spaces for count, but keep as typed in input
  return cleaned;
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

function getCanvasPos(canvas: HTMLCanvasElement, e: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, cols: number, rows: number) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // margins
  const padding = 28;
  const headerH = 86;
  const gridX = padding;
  const gridY = padding + headerH;
  const gridW = w - padding * 2;
  const gridH = h - gridY - padding;

  // header
  ctx.fillStyle = "#111827";
  ctx.font = "700 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.fillText("Bảng tập viết Kanji", w / 2, padding + 34);
  ctx.font = "400 13px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "#374151";
  ctx.fillText("Tên: ____________________", padding, padding + 60);
  ctx.textAlign = "right";
  ctx.fillText("Ngày: ____/____/______", w - padding, padding + 60);

  // grid outer
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.strokeRect(gridX, gridY, gridW, gridH);

  const cellW = gridW / cols;
  const cellH = gridH / rows;

  // grid lines
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  for (let c = 1; c < cols; c++) {
    const x = gridX + c * cellW;
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + gridH);
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    const y = gridY + r * cellH;
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + gridW, y);
    ctx.stroke();
  }

  // diagonal + center guidelines in each cell
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = gridX + c * cellW;
      const y0 = gridY + r * cellH;
      const x1 = x0 + cellW;
      const y1 = y0 + cellH;
      const xc = x0 + cellW / 2;
      const yc = y0 + cellH / 2;

      // diagonals
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y0);
      ctx.lineTo(x0, y1);
      ctx.stroke();

      // center cross
      ctx.beginPath();
      ctx.moveTo(xc, y0);
      ctx.lineTo(xc, y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0, yc);
      ctx.lineTo(x1, yc);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawFaintKanji(
  ctx: CanvasRenderingContext2D,
  glyphs: string[],
  w: number,
  h: number,
  cols: number,
  rows: number
) {
  const padding = 28;
  const headerH = 86;
  const gridX = padding;
  const gridY = padding + headerH;
  const gridW = w - padding * 2;
  const gridH = h - gridY - padding;
  const cellW = gridW / cols;
  const cellH = gridH / rows;

  ctx.save();
  ctx.fillStyle = "rgba(2, 132, 199, 0.20)";
  ctx.textAlign = "center";
  // A font that usually exists on Windows; fallback to system
  ctx.font = `700 ${Math.floor(Math.min(cellW, cellH) * 0.62)}px "Yu Mincho","YuMincho","MS Mincho","Noto Serif JP",serif`;

  for (let i = 0; i < glyphs.length && i < cols; i++) {
    const ch = glyphs[i];
    const x = gridX + i * cellW + cellW / 2;
    const y = gridY + cellH / 2 + (cellH * 0.24);
    ctx.fillText(ch, x, y);
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
  const [input, setInput] = useState("山川花木");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStroke = useRef<Stroke | null>(null);

  const glyphs = useMemo(() => splitGlyphs(sanitizeKanjiInput(input)), [input]);
  const count = glyphs.length;

  const cols = 10;
  const rows = 8;

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawGrid(ctx, canvas.width, canvas.height, cols, rows);
    drawFaintKanji(ctx, glyphs, canvas.width, canvas.height, cols, rows);
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
  }, [strokes, glyphs.join("|")]);

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
    setStrokes([]);
  };

  const handleClear = () => setStrokes([]);
  const handleUndo = () => setStrokes((prev) => prev.slice(0, -1));
  const handleReset = () => {
    setInput("");
    setSelectedTopic(null);
    setStrokes([]);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold font-jp">Kanji Worksheet</h1>
            <p className="text-sm text-muted-foreground">Tạo bảng tập viết Kanji dạng A4 và viết trực tiếp bằng chuột.</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-muted text-sm"
              type="button"
            >
              <RotateCcw size={16} /> Làm lại
            </button>
            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90"
              type="button"
            >
              <Download size={16} /> Tải PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: controls */}
          <div className="space-y-6">
            <div className="glass-card p-6 border rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold">Nhập Kanji (tối đa {MAX_KANJI} ký tự)</label>
                <span className="text-xs text-muted-foreground">{count}/{MAX_KANJI}</span>
              </div>
              <input
                value={input}
                onChange={(e) => {
                  const next = sanitizeKanjiInput(e.target.value);
                  // keep raw but enforce max glyphs
                  const g = splitGlyphs(next);
                  setInput(g.join(""));
                  setSelectedTopic(null);
                }}
                placeholder="Ví dụ: 山川花木"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none font-jp text-lg"
              />
              <p className="text-xs text-muted-foreground mt-2">Mẹo: bạn có thể copy Kanji từ bài học/flashcard rồi dán vào đây.</p>
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

            <div className="md:hidden flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border hover:bg-muted text-sm"
                type="button"
              >
                <RotateCcw size={16} /> Làm lại
              </button>
              <button
                onClick={exportPdf}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90"
                type="button"
              >
                <Download size={16} /> Tải PDF
              </button>
            </div>
          </div>

          {/* Right: preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 border rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Xem trước Worksheet</h2>
              <span className="text-xs text-muted-foreground">A4</span>
            </div>
            <div className="rounded-xl border bg-white p-3 overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full aspect-[1/1.4142] rounded-lg touch-none"
                aria-label="Kanji worksheet canvas"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Nếu bạn muốn “mỗi Kanji 1 dòng nhiều ô” giống worksheet chuyên nghiệp hơn, mình sẽ nâng cấp layout tiếp.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

