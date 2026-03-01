import { useEffect, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Play, CheckCircle, XCircle, ArrowRight, RotateCcw, X, Users } from 'lucide-react';
import axios from 'axios';
import { currentUser } from '@/lib/mockData';
import { apiUrl } from '@/lib/api';
import { playCorrect, playWrong, playComplete } from '@/lib/quizSounds';

interface QuizSummary {
  id: number;
  title: string;
  description: string;
  creatorName: string;
  questionCount: number;
  attempts?: number;
  bestScore?: number;
  bestTotalQuestions?: number;
  bestPercent?: number;
  lastTakenAt?: string;
}

interface QuizQuestion {
  id: number;
  quizId: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
}

interface QuizFormQuestion {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
}

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ q: number; ans: string; correct: string }[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveResultError, setSaveResultError] = useState<string | null>(null);

  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [shareUsername, setShareUsername] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formQuestions, setFormQuestions] = useState<QuizFormQuestion[]>([
    {
      id: 1,
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "A",
    },
  ]);

  const activeUser = localStorage.getItem("username") || currentUser.username;

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get<QuizSummary[]>(apiUrl('/api/quizzes'), {
          params: { username: activeUser },
        });
        setQuizzes(res.data);
      } catch (err) {
        console.error('Failed to fetch quizzes', err);
        setError('Không thể tải danh sách quiz.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const resetForm = () => {
    setEditingQuizId(null);
    setShowForm(false);
    setFormTitle("");
    setFormDescription("");
    setSharedWith([]);
    setShareUsername("");
    setShareError(null);
    setFormQuestions([
      {
        id: 1,
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "A",
      },
    ]);
  };

  const handleAnswer = (option: string) => {
    if (selected) return;
    setSelected(option);
    const q = questions[currentQ];
    const isCorrect = option === q.correctOption;
    if (isCorrect) playCorrect();
    else playWrong();
    setAnswers([...answers, { q: q.id, ans: option, correct: q.correctOption }]);
  };

  const handleNext = async () => {
    if (!activeQuiz || !questions.length) return;

    if (currentQ + 1 >= questions.length) {
      playComplete();
      const scoreNow = answers.filter(a => a.ans === a.correct).length;
      try {
        setSaveResultError(null);
        const activeUser = localStorage.getItem("username") || currentUser.username;
        await axios.post(apiUrl(`/api/quizzes/${activeQuiz}/results`), {
          username: activeUser,
          score: scoreNow,
          totalQuestions: questions.length,
        });
      } catch (err) {
        console.error('Failed to save quiz result', err);
        setSaveResultError("Không lưu được kết quả. Điểm vẫn hiển thị.");
      }
      setFinished(true);
    } else {
      setCurrentQ(currentQ + 1);
      setSelected(null);
    }
  };

  const resetQuiz = () => {
    setActiveQuiz(null);
    setQuestions([]);
    setCurrentQ(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
    setSaveResultError(null);
  };

  const score = answers.filter(a => a.ans === a.correct).length;

  const isFormOpen = showForm || editingQuizId !== null;

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formQuestions.length === 0) return;

    const payloadQuestions = formQuestions
      .filter((q) => q.questionText.trim())
      .map((q) => ({
        questionText: q.questionText.trim(),
        optionA: q.optionA.trim(),
        optionB: q.optionB.trim(),
        optionC: q.optionC.trim(),
        optionD: q.optionD.trim(),
        correctOption: q.correctOption,
      }));

    if (!payloadQuestions.length) return;

    try {
      setLoading(true);
      setError(null);

      const encodedUser = encodeURIComponent(activeUser);

      if (editingQuizId) {
        await axios.put(apiUrl(`/api/quizzes/${editingQuizId}`), {
          title: formTitle.trim(),
          description: formDescription.trim(),
          questions: payloadQuestions,
        }, {
          headers: { "x-user": encodedUser },
        });
      } else {
        await axios.post(apiUrl("/api/quizzes"), {
          title: formTitle.trim(),
          description: formDescription.trim(),
          questions: payloadQuestions,
        }, {
          headers: { "x-user": encodedUser },
        });
      }

      resetForm();

      // refresh list with progress
      const res = await axios.get<QuizSummary[]>(apiUrl('/api/quizzes'), {
        params: { username: activeUser },
      });
      setQuizzes(res.data);
    } catch (err) {
      console.error("Failed to save quiz", err);
      setError("Không thể lưu quiz. Hãy thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const msg = pct >= 80 ? 'すごい！Xuất sắc! 🎉' : pct >= 60 ? 'がんばった！Tốt lắm! 👏' : 'もっと頑張って！Cố gắng thêm nhé! 💪';
    return (
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto glass-card p-8 text-center">
          <span className="text-5xl block mb-4">{pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : '📚'}</span>
          <h2 className="text-2xl font-bold font-jp mb-2">Kết quả Quiz</h2>
          <p className="text-4xl font-bold gradient-text mb-2">{score}/{questions.length}</p>
          <p className="text-sm text-muted-foreground">+{score} điểm (mỗi câu đúng = 1 điểm)</p>
          <p className="text-muted-foreground mb-4">{msg}</p>
          <div className="w-full bg-muted rounded-full h-3 mb-6">
            <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-secondary' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
          </div>
          {saveResultError && (
            <p className="text-sm text-amber-600 bg-amber-500/10 rounded-lg p-3 mb-4">{saveResultError}</p>
          )}
          <div className="space-y-2 mb-6 text-left">
            {answers.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${a.ans === a.correct ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                {a.ans === a.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                Câu {i + 1}: {a.ans === a.correct ? 'Đúng' : `Sai (đáp án: ${a.correct})`}
              </div>
            ))}
          </div>
          <button onClick={resetQuiz} className="gradient-bg text-primary-foreground px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 mx-auto hover:opacity-90 transition-opacity">
            <RotateCcw size={16} /> Làm quiz khác
          </button>
        </motion.div>
      </div>
    );
  }

  if (activeQuiz && questions.length > 0) {
    const q = questions[currentQ];
    const options = [
      { key: 'A', text: q.optionA },
      { key: 'B', text: q.optionB },
      { key: 'C', text: q.optionC },
      { key: 'D', text: q.optionD },
    ];

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={resetQuiz} className="text-sm text-muted-foreground hover:text-foreground">✕ Thoát</button>
            <span className="text-sm text-muted-foreground">{currentQ + 1}/{questions.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mb-8">
            <div className="h-full gradient-bg rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
          </div>

          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 mb-6">
            <p className="text-lg font-semibold font-jp">{q.questionText}</p>
          </motion.div>

          <div className="space-y-3 mb-6">
            {options.map(o => {
              let cls = 'glass-card p-4 cursor-pointer transition-all hover:scale-[1.01]';
              if (selected) {
                if (o.key === q.correctOption) cls += ' !border-green-500 bg-green-500/10';
                else if (o.key === selected) cls += ' !border-destructive bg-destructive/10';
              }
              return (
                <motion.div key={o.key} whileTap={{ scale: 0.98 }} onClick={() => handleAnswer(o.key)} className={cls}>
                  <span className="font-semibold text-primary mr-2">{o.key}.</span> {o.text}
                </motion.div>
              );
            })}
          </div>

          {selected && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleNext}
              className="w-full gradient-bg text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              {currentQ + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'} <ArrowRight size={18} />
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold font-jp flex items-center gap-2">
              <HelpCircle className="text-secondary" /> Quiz
            </h1>
            <p className="text-muted-foreground">
              Kiểm tra kiến thức và (nếu muốn) tự tạo quiz riêng của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isFormOpen) return resetForm();
              setShowForm(true);
            }}
            className="self-start md:self-auto bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            {isFormOpen
              ? (editingQuizId ? "Đóng chỉnh sửa" : "Đóng tạo quiz")
              : "Tạo quiz mới"}
          </button>
        </div>

        {loading && <p className="text-muted-foreground">Đang tải dữ liệu...</p>}
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {quizzes.map((quiz, i) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5 relative"
            >
              <h3 className="font-semibold font-jp text-lg mb-1 truncate">
                {quiz.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {quiz.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {quiz.questionCount} câu • bởi {quiz.creatorName}
                </span>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError(null);
                      const res = await axios.get<{ quiz: QuizSummary; questions: QuizQuestion[] }>(
                        apiUrl(`/api/quizzes/${quiz.id}`),
                        { headers: { "x-user": encodeURIComponent(activeUser) } },
                      );
                      setActiveQuiz(res.data.quiz.id);
                      setQuestions(res.data.questions);
                      setCurrentQ(0);
                      setSelected(null);
                      setAnswers([]);
                      setFinished(false);
                    } catch (err) {
                      console.error('Failed to load quiz detail', err);
                      setError('Không thể tải chi tiết quiz.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="gradient-bg text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:opacity-90 transition-opacity"
                >
                  <Play size={14} /> Làm quiz
                </button>
              </div>
              {quiz.bestPercent !== undefined && quiz.attempts !== undefined && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Đã làm {quiz.attempts} lần • Tốt nhất: {quiz.bestScore}/{quiz.bestTotalQuestions} ({quiz.bestPercent}
                  %)
                </p>
              )}

              {quiz.creatorName === activeUser && (
                <div className="absolute top-3 right-3 flex gap-2 text-xs">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      try {
                        setLoading(true);
                        setError(null);
                        const res = await axios.get<{ quiz: QuizSummary; questions: QuizQuestion[] }>(
                          apiUrl(`/api/quizzes/${quiz.id}`),
                        );
                        setEditingQuizId(res.data.quiz.id);
                        setShowForm(true);
                        setFormTitle(res.data.quiz.title);
                        setFormDescription(res.data.quiz.description || "");
                        const mappedQuestions: QuizFormQuestion[] =
                          res.data.questions.map((q, idx) => ({
                            id: idx + 1,
                            questionText: q.questionText,
                            optionA: q.optionA,
                            optionB: q.optionB,
                            optionC: q.optionC,
                            optionD: q.optionD,
                            correctOption: q.correctOption,
                          }));
                        setFormQuestions(mappedQuestions.length ? mappedQuestions : formQuestions);
                        try {
                          const sharesRes = await axios.get<{ sharedWith: string[] }>(apiUrl(`/api/quizzes/${quiz.id}/shares`), {
                            headers: { "x-user": encodeURIComponent(activeUser) },
                          });
                          setSharedWith(sharesRes.data?.sharedWith ?? []);
                        } catch {
                          setSharedWith([]);
                        }
                      } catch (err) {
                        console.error("Failed to load quiz for editing", err);
                        setError("Không thể tải quiz để chỉnh sửa.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="text-destructive hover:text-destructive/80"
                    onClick={async () => {
                      const ok = window.confirm("Bạn có chắc muốn xóa quiz này?");
                      if (!ok) return;
                      try {
                        setLoading(true);
                        setError(null);
                        await axios.delete(apiUrl(`/api/quizzes/${quiz.id}`), {
                          headers: { "x-user": encodeURIComponent(activeUser) },
                        });
                        const res = await axios.get<QuizSummary[]>(apiUrl('/api/quizzes'), {
                          params: { username: activeUser },
                        });
                        setQuizzes(res.data);
                      } catch (err) {
                        console.error("Failed to delete quiz", err);
                        setError("Không thể xóa quiz. Hãy thử lại.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Xóa
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => resetForm()}
            >
              <motion.div
                className="w-full max-w-2xl glass-card border rounded-2xl shadow-xl overflow-hidden"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b flex items-center justify-between gap-3">
                  <h2 className="font-semibold">
                    {editingQuizId ? "Chỉnh sửa quiz của bạn" : "Tạo quiz mới"}
                  </h2>
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-muted"
                    onClick={() => resetForm()}
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-5">
                  <form onSubmit={handleFormSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tiêu đề</label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Ví dụ: N5 文法テスト"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Mô tả</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Mô tả ngắn về quiz..."
                  />
                </div>

                {editingQuizId && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                    <label className="text-xs font-medium flex items-center gap-1"><Users size={14} /> Chia sẻ với học viên</label>
                    <p className="text-xs text-muted-foreground">Thêm username để chỉ họ mới thấy quiz này (quiz sẽ thành riêng tư)</p>
                    <div className="flex gap-2">
                      <input
                        value={shareUsername}
                        onChange={(e) => { setShareUsername(e.target.value); setShareError(null); }}
                        placeholder="Username học viên..."
                        className="flex-1 px-2 py-1.5 rounded border text-sm"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!shareUsername.trim()) return;
                          try {
                            setShareError(null);
                            await axios.post(apiUrl(`/api/quizzes/${editingQuizId}/share`), { username: shareUsername.trim() }, {
                              headers: { "x-user": encodeURIComponent(activeUser) },
                            });
                            setSharedWith(prev => [...prev, shareUsername.trim()]);
                            setShareUsername("");
                          } catch (err: unknown) {
                            setShareError(axios.isAxiosError(err) && err.response?.data?.message ? err.response.data.message : "Không thể chia sẻ");
                          }
                        }}
                        className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm"
                      >
                        Thêm
                      </button>
                    </div>
                    {shareError && <p className="text-xs text-destructive">{shareError}</p>}
                    {sharedWith.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sharedWith.map(u => (
                          <span key={u} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                            {u}
                            <button type="button" onClick={async () => {
                              try {
                                await axios.delete(apiUrl(`/api/quizzes/${editingQuizId}/share/${encodeURIComponent(u)}`), {
                                  headers: { "x-user": encodeURIComponent(activeUser) },
                                });
                                setSharedWith(prev => prev.filter(x => x !== u));
                              } catch {}
                            }} className="hover:text-destructive"><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
                  {formQuestions.map((q, idx) => (
                    <div key={q.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Câu {idx + 1}
                        </span>
                        {formQuestions.length > 1 && (
                          <button
                            type="button"
                            className="text-xs text-destructive"
                            onClick={() =>
                              setFormQuestions((prev) => prev.filter((x) => x.id !== q.id))
                            }
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <input
                        value={q.questionText}
                        onChange={(e) =>
                          setFormQuestions((prev) =>
                            prev.map((x) =>
                              x.id === q.id ? { ...x, questionText: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="Nội dung câu hỏi"
                        className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      {["A", "B", "C", "D"].map((key) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-xs cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctOption === key}
                            onChange={() =>
                              setFormQuestions((prev) =>
                                prev.map((x) =>
                                  x.id === q.id
                                    ? { ...x, correctOption: key as QuizFormQuestion["correctOption"] }
                                    : x,
                                ),
                              )
                            }
                          />
                          <span className="font-semibold text-primary">{key}.</span>
                          <input
                            value={
                              key === "A"
                                ? q.optionA
                                : key === "B"
                                  ? q.optionB
                                  : key === "C"
                                    ? q.optionC
                                    : q.optionD
                            }
                            onChange={(e) =>
                              setFormQuestions((prev) =>
                                prev.map((x) => {
                                  if (x.id !== q.id) return x;
                                  if (key === "A") return { ...x, optionA: e.target.value };
                                  if (key === "B") return { ...x, optionB: e.target.value };
                                  if (key === "C") return { ...x, optionC: e.target.value };
                                  return { ...x, optionD: e.target.value };
                                }),
                              )
                            }
                            placeholder={`Đáp án ${key}`}
                            className="flex-1 px-2 py-1 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    className="text-xs text-primary"
                    onClick={() =>
                      setFormQuestions((prev) => [
                        ...prev,
                        {
                          id: prev.length ? prev[prev.length - 1].id + 1 : 1,
                          questionText: "",
                          optionA: "",
                          optionB: "",
                          optionC: "",
                          optionD: "",
                          correctOption: "A",
                        },
                      ])
                    }
                  >
                    + Thêm câu hỏi
                  </button>
                  {editingQuizId && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground"
                      onClick={resetForm}
                    >
                      Hủy chỉnh sửa
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => resetForm()}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/60"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {editingQuizId ? "Lưu thay đổi quiz" : "Tạo quiz mới"}
                  </button>
                </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
