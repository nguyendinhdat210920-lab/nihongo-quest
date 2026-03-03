import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Trash2,
  AlertCircle,
  Pencil,
  List,
  LayoutGrid,
  Star,
  Volume2,
} from "lucide-react";
import axios from "axios";
import { currentUser } from "@/lib/mockData";
import { apiUrl } from "@/lib/api";
import { speakText, parseFrontDisplay } from "@/lib/speakText";

interface Deck {
  id: number;
  title: string;
  description: string;
  ownerName: string;
  jlptLevel: string;
  isPublic: boolean;
  cardCount: number;
  createdAt: string;
}

interface Card {
  id: number;
  deckId: number;
  front: string;
  back: string;
  example: string;
  learned: boolean;
}

export default function Flashcards() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDeckForm, setShowDeckForm] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckDesc, setDeckDesc] = useState("");
  const [deckJlpt, setDeckJlpt] = useState("N5");
  const [deckPublic, setDeckPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showCardForm, setShowCardForm] = useState(false);
  const [cardFront, setCardFront] = useState("");
  const [cardKanji, setCardKanji] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [cardExample, setCardExample] = useState("");

  const [viewMode, setViewMode] = useState<"study" | "list">("study");
  const [studyFilter, setStudyFilter] = useState<"all" | "needReview">("all");
  const [studyComplete, setStudyComplete] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editKanji, setEditKanji] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editExample, setEditExample] = useState("");

  const activeUser =
    (typeof window !== "undefined" && localStorage.getItem("username")) ||
    currentUser.username;

  const fetchDecks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (showOnlyMine && activeUser) params.username = activeUser;
      const res = await axios.get<Deck[]>(
        apiUrl("/api/flashcards/decks"),
        { params }
      );
      setDecks(res.data);
    } catch (err: unknown) {
      console.error("Failed to fetch decks", err);
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : axios.isAxiosError(err) && err.code === "ERR_NETWORK"
            ? "Không thể kết nối server. Chạy: cd server && npm run dev"
            : "Không thể tải danh sách deck.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, [showOnlyMine]);

  useEffect(() => {
    const needReview = cards.filter((c) => !c.learned);
    const studyCards = studyFilter === "needReview" ? needReview : cards;
    if (studyCards.length > 0 && currentCard >= studyCards.length) {
      setCurrentCard(Math.max(0, studyCards.length - 1));
    }
  }, [studyFilter, cards, currentCard]);

  useEffect(() => {
    if (!selectedDeck || cards.length === 0 || viewMode !== "study") return;
    const needReview = cards.filter((c) => !c.learned);
    const studyCards = studyFilter === "needReview" ? needReview : cards;
    if (studyCards.length === 0) return;
    const safeIndex = Math.min(Math.max(0, currentCard), studyCards.length - 1);

    const handleKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentCard(Math.max(0, safeIndex - 1));
        setFlipped(false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentCard(Math.min(studyCards.length - 1, safeIndex + 1));
        setFlipped(false);
      } else if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedDeck, cards, studyFilter, currentCard, viewMode]);

  const fetchDeckWithCards = async (deckId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<{ deck: Deck; cards: Card[] }>(
        apiUrl(`/api/flashcards/decks/${deckId}`)
      );
      setSelectedDeck(res.data.deck);
      setCards(res.data.cards);
      setCurrentCard(0);
      setFlipped(false);
    } catch (err) {
      console.error("Failed to fetch deck", err);
      setError("Không thể tải deck.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckTitle.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await axios.post(
        apiUrl("/api/flashcards/decks"),
        {
          title: deckTitle.trim(),
          description: deckDesc.trim(),
          jlptLevel: deckJlpt,
          isPublic: deckPublic,
        },
        { headers: { "x-user": encodeURIComponent(activeUser) } }
      );
      setDeckTitle("");
      setDeckDesc("");
      setDeckJlpt("N5");
      setDeckPublic(true);
      setShowDeckForm(false);
      fetchDecks();
    } catch (err: unknown) {
      console.error("Failed to create deck", err);
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : axios.isAxiosError(err) && err.code === "ERR_NETWORK"
            ? "Không thể kết nối server. Chạy server: cd server && npm run dev"
            : "Không thể tạo deck.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDeck = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc muốn xóa deck này?")) return;
    try {
      setLoading(true);
      await axios.delete(apiUrl(`/api/flashcards/decks/${id}`), {
        headers: { "x-user": encodeURIComponent(activeUser) },
      });
      if (selectedDeck?.id === id) {
        setSelectedDeck(null);
        setCards([]);
      }
      fetchDecks();
    } catch (err) {
      console.error("Failed to delete deck", err);
      setError("Không thể xóa deck.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeck || !cardFront.trim() || !cardBack.trim()) return;
    const front = cardKanji.trim() ? `${cardKanji.trim()}（${cardFront.trim()}）` : cardFront.trim();
    try {
      setSubmitting(true);
      setError(null);
      await axios.post(
        apiUrl(`/api/flashcards/decks/${selectedDeck.id}/cards`),
        { front, back: cardBack.trim(), example: cardExample.trim() },
        { headers: { "x-user": encodeURIComponent(activeUser) } }
      );
      setCardFront("");
      setCardKanji("");
      setCardBack("");
      setCardExample("");
      setShowCardForm(false);
      fetchDeckWithCards(selectedDeck.id);
    } catch (err) {
      console.error("Failed to add card", err);
      setError("Không thể thêm thẻ.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (cardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Xóa thẻ này?")) return;
    try {
      await axios.delete(apiUrl(`/api/flashcards/cards/${cardId}`), {
        headers: { "x-user": encodeURIComponent(activeUser) },
      });
      if (selectedDeck) fetchDeckWithCards(selectedDeck.id);
    } catch (err) {
      console.error("Failed to delete card", err);
      setError("Không thể xóa thẻ.");
    }
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard || !editFront.trim() || !editBack.trim()) return;
    const front = editKanji.trim() ? `${editKanji.trim()}（${editFront.trim()}）` : editFront.trim();
    try {
      setSubmitting(true);
      await axios.put(
        apiUrl(`/api/flashcards/cards/${editingCard.id}`),
        { front, back: editBack.trim(), example: editExample.trim() },
        { headers: { "x-user": encodeURIComponent(activeUser) } }
      );
      setEditingCard(null);
      if (selectedDeck) fetchDeckWithCards(selectedDeck.id);
    } catch (err) {
      console.error("Failed to update card", err);
      setError("Không thể sửa thẻ.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLearned = async (card: Card, onSuccess?: () => void) => {
    try {
      await axios.put(
        apiUrl(`/api/flashcards/cards/${card.id}`),
        { learned: !card.learned },
        { headers: { "x-user": encodeURIComponent(activeUser) } }
      );
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, learned: !c.learned } : c))
      );
      onSuccess?.();
    } catch (err) {
      console.error("Failed to toggle learned", err);
    }
  };

  const filteredDecks = decks.filter(
    (d) =>
      (filter === "all" || d.jlptLevel === filter) &&
      d.title.toLowerCase().includes(search.toLowerCase())
  );

  const goBack = () => {
    setSelectedDeck(null);
    setCards([]);
    setCurrentCard(0);
    setFlipped(false);
    setViewMode("study");
    setStudyFilter("all");
    setStudyComplete(false);
    setCompletedCount(0);
    setEditingCard(null);
  };

  if (selectedDeck && cards.length > 0) {
    const needReviewCards = cards.filter((c) => !c.learned);
    const studyCards = studyFilter === "needReview" ? needReviewCards : cards;
    const safeIndex = Math.min(Math.max(0, currentCard), studyCards.length - 1);
    const card = studyCards[safeIndex];
    const isOwner = selectedDeck.ownerName === activeUser;
    const learnedCount = cards.filter((c) => c.learned).length;

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} /> Quay lại
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === "study" ? "list" : "study")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80"
              title={viewMode === "study" ? "Xem danh sách thẻ" : "Chế độ học"}
            >
              {viewMode === "study" ? <List size={16} /> : <LayoutGrid size={16} />}
              {viewMode === "study" ? "Danh sách" : "Học"}
            </button>
            {isOwner && (
              <button
                onClick={() => setShowCardForm(true)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Thêm thẻ
              </button>
            )}
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold font-jp mb-2">{selectedDeck.title}</h2>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setStudyFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${studyFilter === "all" ? "gradient-bg text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              >
                Tất cả ({cards.length})
              </button>
              <button
                onClick={() => setStudyFilter("needReview")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${studyFilter === "needReview" ? "gradient-bg text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              >
                <Star size={14} fill={studyFilter === "needReview" ? "currentColor" : "none"} />
                Cần ôn ({needReviewCards.length})
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {studyFilter === "needReview" ? needReviewCards.length : cards.length} thẻ
              {studyFilter === "all" && learnedCount > 0 && ` · ${learnedCount} đã thuộc`}
            </p>
            <div className="space-y-3">
              {(studyFilter === "needReview" ? needReviewCards : cards).map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="glass-card p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const { reading, kanji } = parseFrontDisplay(c.front);
                        return (
                          <div>
                            <p className="font-jp font-semibold text-lg">{reading}</p>
                            {kanji && <p className="font-jp text-sm text-muted-foreground">Kanji: {kanji}</p>}
                          </div>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={(e) => speakText(c.front, e)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                        title="Nghe phát âm"
                        aria-label="Nghe phát âm"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <p className="text-muted-foreground text-sm mt-0.5">{c.back}</p>
                    {c.example && (
                      <p className="text-xs text-muted-foreground italic mt-1">"{c.example}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isOwner && (
                      <>
                        <button
                          onClick={() => { if (c.learned) handleToggleLearned(c); }}
                          className={`p-2 rounded-lg transition-colors ${!c.learned ? "bg-amber-500/20 text-amber-600" : "bg-muted hover:bg-muted/80"}`}
                          title={c.learned ? "Đánh dấu cần ôn" : "Cần ôn"}
                        >
                          <Star size={18} fill={!c.learned ? "currentColor" : "none"} />
                        </button>
                        <button
                          onClick={() => { if (!c.learned) handleToggleLearned(c); }}
                          className={`p-2 rounded-lg transition-colors ${c.learned ? "bg-primary/20 text-primary" : "bg-muted hover:bg-muted/80"}`}
                          title="Đã thuộc"
                        >
                          <Check size={18} />
                        </button>
                      </>
                    )}
                    {!isOwner && (
                      <>
                        {!c.learned && <Star size={18} className="text-amber-500/70" fill="currentColor" title="Cần ôn" />}
                        {c.learned && <Check size={18} className="text-primary" title="Đã thuộc" />}
                      </>
                    )}
                    {isOwner && (
                      <>
                        <button
                          onClick={() => {
                            setEditingCard(c);
                            const { reading, kanji } = parseFrontDisplay(c.front);
                            setEditFront(reading);
                            setEditKanji(kanji || "");
                            setEditBack(c.back);
                            setEditExample(c.example || "");
                          }}
                          className="p-2 rounded-lg hover:bg-muted"
                          title="Sửa"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCard(c.id, e)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : studyComplete ? (
          <div className="max-w-lg mx-auto glass-card p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="font-semibold text-xl mb-2">Xong rồi!</h3>
            <p className="text-muted-foreground mb-6">
              Bạn đã xem hết {completedCount} thẻ.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={goBack}
                className="px-5 py-2.5 rounded-xl border hover:bg-muted"
              >
                Quay lại danh sách deck
              </button>
              {needReviewCards.length > 0 && studyFilter === "all" && (
                <button
                  onClick={() => { setStudyFilter("needReview"); setCurrentCard(0); setStudyComplete(false); setFlipped(false); }}
                  className="px-5 py-2.5 rounded-xl gradient-bg text-primary-foreground font-medium flex items-center justify-center gap-2"
                >
                  <Star size={18} fill="currentColor" />
                  Ôn lại {needReviewCards.length} thẻ chưa thuộc
                </button>
              )}
            </div>
          </div>
        ) : studyCards.length === 0 ? (
          <div className="max-w-lg mx-auto glass-card p-8 text-center">
            <Star size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Không còn thẻ cần ôn</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tất cả {cards.length} thẻ đã được đánh dấu thuộc. Chuyển sang "Tất cả" để xem lại.
            </p>
            <button
              onClick={() => setStudyFilter("all")}
              className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm"
            >
              Xem tất cả thẻ
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold font-jp text-center mb-2">
              {selectedDeck.title}
            </h2>
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={() => { setStudyFilter("all"); setCurrentCard(0); setFlipped(false); setStudyComplete(false); setCompletedCount(0); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${studyFilter === "all" ? "gradient-bg text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              >
                Tất cả ({cards.length})
              </button>
              <button
                onClick={() => { setStudyFilter("needReview"); setCurrentCard(0); setFlipped(false); setStudyComplete(false); setCompletedCount(0); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${studyFilter === "needReview" ? "gradient-bg text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              >
                <Star size={14} fill={studyFilter === "needReview" ? "currentColor" : "none"} />
                Cần ôn ({needReviewCards.length})
              </button>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-6">
              {safeIndex + 1} / {studyCards.length}
              {learnedCount > 0 && studyFilter === "all" && (
                <span className="ml-2 text-primary">· {learnedCount} đã thuộc</span>
              )}
            </p>
            <p className="text-center text-xs text-muted-foreground mb-4">
              ← → chuyển thẻ · Space lật thẻ
            </p>

            <div
              className="perspective-1000 cursor-pointer mb-6"
              onClick={() => setFlipped(!flipped)}
            >
              <motion.div
                className="relative w-full h-72 preserve-3d"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
              >
                <div className="absolute inset-0 backface-hidden glass-card flex flex-col items-center justify-center p-8">
                  {(() => {
                    const { reading, kanji } = parseFrontDisplay(card.front);
                    return (
                      <>
                        <p className="text-4xl font-jp font-bold mb-1">{reading}</p>
                        {kanji && <p className="text-xl font-jp text-muted-foreground mb-2">Kanji: {kanji}</p>}
                      </>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={(e) => speakText(card.front, e)}
                    className="mt-2 p-2 rounded-full hover:bg-white/20 transition-colors"
                    title="Nghe phát âm"
                    aria-label="Nghe phát âm"
                  >
                    <Volume2 size={24} />
                  </button>
                  <p className="text-sm text-muted-foreground mt-2">Nhấn để lật thẻ</p>
                </div>
                <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card flex flex-col items-center justify-center p-8 gradient-accent-bg text-primary-foreground">
                  <p className="text-2xl font-bold mb-3">{card.back}</p>
                  {card.example && (
                    <p className="text-sm opacity-80 italic">"{card.example}"</p>
                  )}
                </div>
              </motion.div>
            </div>

            {isOwner && (
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => { if (card.learned) handleToggleLearned(card); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${!card.learned ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-muted hover:bg-muted/80"}`}
                    title="Đánh dấu cần ôn (chưa thuộc)"
                  >
                    <Star size={18} fill={!card.learned ? "currentColor" : "none"} />
                    {card.learned ? "Đánh dấu cần ôn" : "Cần ôn"}
                  </button>
                <button
                  onClick={() => {
                    if (!card.learned) {
                      setFlipped(false);
                      if (safeIndex < studyCards.length - 1) {
                        setCurrentCard(safeIndex + 1);
                      } else {
                        setCompletedCount(studyCards.length);
                        setStudyComplete(true);
                      }
                      handleToggleLearned(card);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${card.learned ? "bg-primary/20 text-primary" : "bg-muted hover:bg-muted/80"}`}
                    title="Đã thuộc (tự chuyển thẻ tiếp)"
                  >
                    <Check size={18} />
                    Đã thuộc
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCard(card);
                      const { reading, kanji } = parseFrontDisplay(card.front);
                      setEditFront(reading);
                      setEditKanji(kanji || "");
                      setEditBack(card.back);
                      setEditExample(card.example || "");
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80"
                    title="Sửa thẻ"
                  >
                    <Pencil size={16} /> Sửa
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Xóa thẻ này?")) {
                        handleDeleteCard(card.id, e);
                        setFlipped(false);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-destructive/10 text-destructive"
                    title="Xóa thẻ"
                  >
                    <Trash2 size={16} /> Xóa
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setCurrentCard(Math.max(0, safeIndex - 1));
                  setFlipped(false);
                }}
                disabled={safeIndex === 0}
                className="p-3 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setFlipped(false)}
                className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              >
                <RotateCcw size={20} />
              </button>
              {safeIndex === studyCards.length - 1 ? (
                <button
                  onClick={() => { setCompletedCount(studyCards.length); setStudyComplete(true); }}
                  className="px-5 py-3 rounded-xl gradient-bg text-primary-foreground font-medium"
                >
                  Xong
                </button>
              ) : (
                <button
                  onClick={() => { setCurrentCard(safeIndex + 1); setFlipped(false); }}
                  className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            <div className="mt-6 w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full gradient-bg rounded-full transition-all"
                style={{ width: `${studyCards.length ? ((safeIndex + 1) / studyCards.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {showCardForm && selectedDeck && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowCardForm(false)}
          >
            <motion.div
              className="w-full max-w-md glass-card border rounded-2xl p-6"
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Thêm thẻ mới</h2>
                <button onClick={() => setShowCardForm(false)} className="p-2 rounded-full hover:bg-muted">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddCard} className="space-y-3">
                <div>
                  <input
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    placeholder="Cách đọc (hiragana) * ví dụ: こうこう"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    required
                  />
                  <input
                    value={cardKanji}
                    onChange={(e) => setCardKanji(e.target.value)}
                    placeholder="Kanji (tùy chọn) ví dụ: 高校 — hiển thị dưới cách đọc"
                    className="w-full px-3 py-2 rounded-lg border text-sm mt-2"
                  />
                </div>
                <input
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder="Mặt sau (nghĩa) * ví dụ: Trường THPT"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  required
                />
                <input
                  value={cardExample}
                  onChange={(e) => setCardExample(e.target.value)}
                  placeholder="Ví dụ câu (tùy chọn)"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowCardForm(false)} className="flex-1 px-4 py-2 rounded-lg border">
                    Hủy
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 gradient-bg text-primary-foreground py-2 rounded-lg disabled:opacity-50">
                    {submitting ? "Đang thêm..." : "Thêm thẻ"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {editingCard && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setEditingCard(null)}
          >
            <motion.div
              className="w-full max-w-md glass-card border rounded-2xl p-6"
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Sửa thẻ</h2>
                <button onClick={() => setEditingCard(null)} className="p-2 rounded-full hover:bg-muted">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleUpdateCard} className="space-y-3">
                <div>
                  <input
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    placeholder="Cách đọc (hiragana) *"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    required
                  />
                  <input
                    value={editKanji}
                    onChange={(e) => setEditKanji(e.target.value)}
                    placeholder="Kanji (tùy chọn) — hiển thị dưới cách đọc"
                    className="w-full px-3 py-2 rounded-lg border text-sm mt-2"
                  />
                </div>
                <input
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  placeholder="Mặt sau (nghĩa) *"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  required
                />
                <input
                  value={editExample}
                  onChange={(e) => setEditExample(e.target.value)}
                  placeholder="Ví dụ câu (tùy chọn)"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingCard(null)} className="flex-1 px-4 py-2 rounded-lg border">
                    Hủy
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 gradient-bg text-primary-foreground py-2 rounded-lg disabled:opacity-50">
                    {submitting ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    );
  }

  if (selectedDeck && cards.length === 0) {
    const isOwner = selectedDeck.ownerName === activeUser;
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft size={16} /> Quay lại
        </button>

        <div className="max-w-lg mx-auto glass-card p-8 text-center">
          <h2 className="text-xl font-bold font-jp mb-2">{selectedDeck.title}</h2>
          <p className="text-muted-foreground mb-6">
            Deck này chưa có thẻ nào.
            {isOwner && " Bạn có thể thêm thẻ bên dưới."}
          </p>

          {isOwner && (
            <>
              {!showCardForm ? (
                <button
                  onClick={() => setShowCardForm(true)}
                  className="gradient-bg text-primary-foreground px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 mx-auto hover:opacity-90"
                >
                  <Plus size={18} /> Thêm thẻ đầu tiên
                </button>
              ) : (
                <form onSubmit={handleAddCard} className="space-y-3 text-left">
                  <input
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    placeholder="Cách đọc (hiragana) * ví dụ: こうこう"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    required
                  />
                  <input
                    value={cardKanji}
                    onChange={(e) => setCardKanji(e.target.value)}
                    placeholder="Kanji (tùy chọn) ví dụ: 高校 — hiển thị dưới cách đọc"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                  />
                  <input
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    placeholder="Mặt sau (nghĩa) * ví dụ: Trường THPT"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    required
                  />
                  <input
                    value={cardExample}
                    onChange={(e) => setCardExample(e.target.value)}
                    placeholder="Ví dụ câu (tùy chọn)"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCardForm(false)}
                      className="flex-1 px-4 py-2 rounded-lg border"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 gradient-bg text-primary-foreground py-2 rounded-lg disabled:opacity-50"
                    >
                      {submitting ? "Đang thêm..." : "Thêm thẻ"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-jp flex items-center gap-2">
              <BookOpen className="text-primary" /> Flashcards
            </h1>
            <p className="text-muted-foreground mt-1">
              Tạo, học và chia sẻ bộ thẻ từ vựng
            </p>
          </div>
          <button
            onClick={() => setShowDeckForm(true)}
            className="gradient-bg text-primary-foreground px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={18} /> Tạo Deck mới
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm deck..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${showOnlyMine ? "gradient-bg text-primary-foreground" : "bg-muted"}`}
          >
            {showOnlyMine ? "Của tôi" : "Tất cả"}
          </button>
          <div className="flex gap-2 flex-wrap">
            {["all", "N5", "N4", "N3", "N2", "N1"].map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${filter === level ? "gradient-bg text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {level === "all" ? "Tất cả" : level}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-4 flex items-center gap-1">
            <AlertCircle size={16} /> {error}
          </p>
        )}
        {loading && (
          <p className="text-muted-foreground">Đang tải deck...</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecks.map((deck, i) => (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => fetchDeckWithCards(deck.id)}
              className="glass-card p-5 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    {deck.jlptLevel}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {deck.cardCount} thẻ
                  </span>
                </div>
                {deck.ownerName === activeUser && (
                  <button
                    onClick={(e) => handleDeleteDeck(deck.id, e)}
                    className="shrink-0 p-2 rounded-lg hover:bg-destructive/10 text-destructive opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Xóa deck"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <h3 className="font-semibold font-jp text-lg mb-1 line-clamp-2">{deck.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {deck.description}
              </p>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">bởi {deck.ownerName || "Ẩn danh"}</span>
                {deck.isPublic && (
                  <span className="shrink-0 text-primary">🌐 Public</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {!loading && !filteredDecks.length && (
          <p className="text-muted-foreground text-center py-8">
            Chưa có deck nào. Hãy tạo deck mới!
          </p>
        )}
      </motion.div>

      <AnimatePresence>
        {showDeckForm && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeckForm(false)}
          >
            <motion.div
              className="w-full max-w-md glass-card border rounded-2xl p-6"
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Tạo Deck mới</h2>
                <button
                  onClick={() => setShowDeckForm(false)}
                  className="p-2 rounded-full hover:bg-muted"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateDeck} className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Tiêu đề</label>
                  <input
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    placeholder="Ví dụ: JLPT N5 基本語彙"
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Mô tả</label>
                  <input
                    value={deckDesc}
                    onChange={(e) => setDeckDesc(e.target.value)}
                    placeholder="Mô tả ngắn..."
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Cấp độ JLPT</label>
                  <select
                    value={deckJlpt}
                    onChange={(e) => setDeckJlpt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border mt-1"
                  >
                    {["N5", "N4", "N3", "N2", "N1"].map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deckPublic}
                    onChange={(e) => setDeckPublic(e.target.checked)}
                  />
                  <span className="text-sm">Công khai</span>
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeckForm(false)}
                    className="flex-1 px-4 py-2 rounded-lg border"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 gradient-bg text-primary-foreground py-2 rounded-lg disabled:opacity-50"
                  >
                    {submitting ? "Đang tạo..." : "Tạo deck"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
