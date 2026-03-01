import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import {
  BookOpen,
  AlertCircle,
  PlusCircle,
  Pencil,
  Trash2,
  UserCircle2,
  X,
  Save,
  Search,
  Filter,
  Eye,
  Download,
  Lock,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { currentUser } from "@/lib/mockData";
import { speakText } from "@/lib/speakText";

/** Tách nội dung thành các đoạn, từ tiếng Nhật có thể click để nghe phát âm */
function LessonContentWithSpeak({ content }: { content: string }) {
  const hasJapanese = (s: string) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(s);
  const parts = content.split(/([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g).filter(Boolean);

  return (
    <div className="whitespace-pre-line text-[1.05rem] leading-relaxed">
      {parts.map((part, i) =>
        hasJapanese(part) ? (
          <span
            key={i}
            onClick={(e) => speakText(part, e as unknown as React.MouseEvent)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && speakText(part)}
            className="cursor-pointer hover:bg-primary/15 hover:underline decoration-dotted rounded px-0.5 -mx-0.5 transition-colors"
            title="Click để nghe phát âm"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

interface Lesson {
  Id: number;
  Title: string;
  Content: string;
  CreatedBy?: string | null;
  AttachmentUrl?: string | null;
  AttachmentType?: string | null;
  Status?: string | null;
  IsPublic?: boolean | number | null;
}

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // States cho Form tạo mới
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States cho chỉnh sửa
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editIsPublic, setEditIsPublic] = useState(true);

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const activeUser =
    (typeof window !== "undefined" && localStorage.getItem("username")) ||
    currentUser.username;

  const fetchLessons = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await axios.get<Lesson[]>(
        apiUrl("/api/lessons"),
        {
          params: { username: activeUser },
        },
      );
      setLessons(response.data);
    } catch (err) {
      setError("Không thể tải danh sách bài học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLessons(); }, []);

  const isLessonPublic = (lesson: Lesson) => {
    if (lesson.IsPublic == null) return true;
    return !!lesson.IsPublic;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", newTitle);
    formData.append("content", newContent);
    formData.append("isPublic", newIsPublic ? "1" : "0");
    if (newFile) formData.append("file", newFile);

    try {
      setError(null);
      await axios.post(apiUrl("/api/lessons"), formData, {
        headers: { "x-user": encodeURIComponent(activeUser) },
      });
      setNewTitle(""); setNewContent(""); setNewFile(null); setNewIsPublic(true);
      fetchLessons();
    } catch (err) {
      setError("Lỗi khi tạo bài học.");
    } finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (id: number) => {
    const formData = new FormData();
    formData.append("title", editTitle);
    formData.append("content", editContent);
    formData.append("isPublic", editIsPublic ? "1" : "0");
    if (editFile) formData.append("file", editFile);

    try {
      setError(null);
      await axios.put(apiUrl(`/api/lessons/${id}`), formData, {
        headers: { "x-user": encodeURIComponent(activeUser) },
      });
      setEditingId(null);
      fetchLessons();
    } catch (err) {
      setError("Lỗi khi cập nhật bài học.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa?")) return;
    try {
      setError(null);
      await axios.delete(apiUrl(`/api/lessons/${id}`), {
        headers: { "x-user": encodeURIComponent(activeUser) },
      });
      fetchLessons();
    } catch (err) {
      setError("Lỗi khi xóa bài học.");
    }
  };

  const filteredLessons = lessons.filter(l => {
    const matchesSearch =
      l.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.Content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMine = showOnlyMine ? l.CreatedBy === activeUser : true;
    return matchesSearch && matchesMine;
  });

  // Full-page reader khi đang đọc bài
  if (selectedLesson) {
    const idx = filteredLessons.findIndex((l) => l.Id === selectedLesson.Id);
    const prevLesson = idx > 0 ? filteredLessons[idx - 1] : null;
    const nextLesson = idx >= 0 && idx < filteredLessons.length - 1 ? filteredLessons[idx + 1] : null;

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setSelectedLesson(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft size={18} /> Quay lại danh sách
              </button>
              <div className="flex items-center gap-2">
                {prevLesson && (
                  <button
                    onClick={() => setSelectedLesson(prevLesson)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm"
                  >
                    <ChevronLeft size={16} /> Trước
                  </button>
                )}
                {nextLesson && (
                  <button
                    onClick={() => setSelectedLesson(nextLesson)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm"
                  >
                    Sau <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>

            <article className="glass-card border rounded-2xl p-8 md:p-10">
              <header className="mb-8 pb-6 border-b">
                <h1 className="text-2xl md:text-3xl font-bold font-jp mb-2">{selectedLesson.Title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserCircle2 size={16} />
                  {selectedLesson.CreatedBy || "Hệ thống"}
                </div>
              </header>

              <div className="prose prose-lg max-w-none">
                <LessonContentWithSpeak content={selectedLesson.Content} />
              </div>

              {selectedLesson.AttachmentUrl && (
                <div className="mt-8 pt-6 border-t flex flex-wrap gap-3">
                  <a
                    href={selectedLesson.AttachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-muted text-sm"
                  >
                    <Eye size={18} /> Xem tệp đính kèm
                  </a>
                  <a
                    href={`${apiUrl("/api/files/download")}?src=${encodeURIComponent(selectedLesson.AttachmentUrl)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-muted text-sm"
                  >
                    <Download size={18} /> Tải về
                  </a>
                </div>
              )}
            </article>

            <div className="flex justify-between">
              {prevLesson ? (
                <button
                  onClick={() => setSelectedLesson(prevLesson)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft size={18} /> {prevLesson.Title}
                </button>
              ) : (
                <span />
              )}
              {nextLesson && (
                <button
                  onClick={() => setSelectedLesson(nextLesson)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-right max-w-[50%] truncate"
                >
                  {nextLesson.Title} <ChevronRight size={18} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold font-jp flex items-center gap-2">
            <BookOpen className="text-primary" /> Bài học
          </h1>
          <p className="text-muted-foreground">
            Đọc và học bài học tiếng Nhật trực tiếp trên web. Click vào bài để đọc.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột trái: Danh sách */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" placeholder="Tìm bài học..." 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setShowOnlyMine(!showOnlyMine)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${showOnlyMine ? 'bg-primary text-white' : 'bg-muted'}`}
              >
                <Filter size={18} /> {showOnlyMine ? "Của tôi" : "Tất cả"}
              </button>
            </div>

            {error && (
              <div className="glass-card p-4 border rounded-xl flex items-start gap-3 text-destructive">
                <AlertCircle className="mt-0.5" size={18} />
                <div className="text-sm">{error}</div>
              </div>
            )}

            {loading && (
              <div className="glass-card p-6 border rounded-xl text-sm text-muted-foreground">
                Đang tải bài học...
              </div>
            )}

            <AnimatePresence>
              {filteredLessons.map((lesson) => (
                <motion.div
                  key={lesson.Id}
                  layout
                  className="glass-card p-5 border rounded-xl cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all group"
                  onClick={() => {
                    if (editingId === lesson.Id) return;
                    setSelectedLesson(lesson);
                  }}
                >
                  {editingId === lesson.Id ? (
                    <div className="space-y-4">
                      <input className="w-full p-2 border rounded" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                      <textarea className="w-full p-2 border rounded" value={editContent} onChange={e => setEditContent(e.target.value)} />
                      <div className="flex items-center gap-2 text-sm">
                        <button
                          type="button"
                          onClick={() => setEditIsPublic(true)}
                          className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${editIsPublic ? "bg-primary text-white border-primary" : "bg-transparent"}`}
                        >
                          <Globe size={16} /> Công khai
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditIsPublic(false)}
                          className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${!editIsPublic ? "bg-primary text-white border-primary" : "bg-transparent"}`}
                        >
                          <Lock size={16} /> Chỉ mình tôi
                        </button>
                      </div>
                      <input type="file" onChange={e => setEditFile(e.target.files?.[0] || null)} />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(lesson.Id)} className="bg-green-600 text-white px-4 py-1 rounded flex items-center gap-1"><Save size={16}/> Lưu</button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-500 text-white px-4 py-1 rounded flex items-center gap-1"><X size={16}/> Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <BookOpen size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{lesson.Title}</h3>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <span
                            className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 ${isLessonPublic(lesson) ? "border-emerald-500/30 text-emerald-700" : "border-amber-500/30 text-amber-700"}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isLessonPublic(lesson) ? <Globe size={12} /> : <Lock size={12} />}
                            {isLessonPublic(lesson) ? "Công khai" : "Riêng tư"}
                          </span>
                          {lesson.Status && (
                            <span
                              className="text-[11px] px-2 py-1 rounded-full border text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lesson.Status}
                            </span>
                          )}
                          {lesson.CreatedBy === activeUser && (
                            <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setEditingId(lesson.Id);
                                  setEditTitle(lesson.Title);
                                  setEditContent(lesson.Content);
                                  setEditFile(null);
                                  setEditIsPublic(isLessonPublic(lesson));
                                }}
                                className="p-2 hover:bg-muted rounded-full"
                                aria-label="Sửa"
                              >
                                <Pencil size={16}/>
                              </button>
                              <button
                                onClick={() => handleDelete(lesson.Id)}
                                className="p-2 hover:bg-destructive/10 text-destructive rounded-full"
                                aria-label="Xóa"
                              >
                                <Trash2 size={16}/>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                        {lesson.Content.length > 120 ? `${lesson.Content.slice(0, 120)}...` : lesson.Content}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><UserCircle2 size={12}/> {lesson.CreatedBy || "Hệ thống"}</span>
                        <span>~{Math.ceil(lesson.Content.length / 400)} phút đọc</span>
                        {lesson.AttachmentUrl && (
                          <span className="flex items-center gap-1 text-primary">
                            <Eye size={12}/> Có đính kèm
                          </span>
                        )}
                      </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Cột phải: Form tạo */}
          <div className="lg:col-span-1">
            <form onSubmit={handleCreate} className="glass-card p-6 border rounded-xl sticky top-8 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><PlusCircle className="text-primary"/> Bài học mới</h2>
              <input 
                required placeholder="Tiêu đề bài học..." 
                className="w-full p-3 border rounded-lg"
                value={newTitle} onChange={e => setNewTitle(e.target.value)}
              />
              <textarea 
                required placeholder="Nội dung bài học..." rows={5}
                className="w-full p-3 border rounded-lg"
                value={newContent} onChange={e => setNewContent(e.target.value)}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Đính kèm ảnh hoặc PDF</label>
                <input type="file" accept="image/*,.pdf" className="w-full text-sm" onChange={e => setNewFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Quyền xem</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewIsPublic(true)}
                    className={`flex-1 px-3 py-2 rounded-lg border flex items-center justify-center gap-2 ${newIsPublic ? "bg-primary text-white border-primary" : "bg-transparent"}`}
                  >
                    <Globe size={16} /> Công khai
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewIsPublic(false)}
                    className={`flex-1 px-3 py-2 rounded-lg border flex items-center justify-center gap-2 ${!newIsPublic ? "bg-primary text-white border-primary" : "bg-transparent"}`}
                  >
                    <Lock size={16} /> Chỉ mình tôi
                  </button>
                </div>
              </div>
              <button 
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? "Đang lưu..." : "Lưu bài học"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}