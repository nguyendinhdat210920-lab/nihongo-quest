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
} from "lucide-react";
import { currentUser } from "@/lib/mockData";

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

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="text-primary" /> Bài học tiếng Nhật
          </h1>
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
                  className="glass-card p-6 border rounded-xl shadow-sm relative cursor-pointer hover:shadow-md transition-shadow"
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
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-xl font-bold mb-2">{lesson.Title}</h3>
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
                      <p className="text-muted-foreground mb-4 whitespace-pre-line">
                        {lesson.Content.length > 220 ? `${lesson.Content.slice(0, 220)}...` : lesson.Content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><UserCircle2 size={14}/> {lesson.CreatedBy || "Hệ thống"}</span>
                        {lesson.AttachmentUrl && (
                          <div className="flex gap-3 ml-auto">
                            <a onClick={(e) => e.stopPropagation()} href={lesson.AttachmentUrl} target="_blank" className="flex items-center gap-1 text-primary hover:underline"><Eye size={14}/> Xem</a>
                            <a
                              onClick={(e) => e.stopPropagation()}
                              href={`${apiUrl("/api/files/download")}?src=${encodeURIComponent(lesson.AttachmentUrl)}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Download size={14}/> Tải về
                            </a>
                          </div>
                        )}
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

      {/* Modal xem chi tiết */}
      <AnimatePresence>
        {selectedLesson && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLesson(null)}
          >
            <motion.div
              className="w-full max-w-3xl glass-card border rounded-2xl shadow-xl overflow-hidden"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold truncate">{selectedLesson.Title}</h3>
                    <span className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 ${isLessonPublic(selectedLesson) ? "border-emerald-500/30 text-emerald-700" : "border-amber-500/30 text-amber-700"}`}>
                      {isLessonPublic(selectedLesson) ? <Globe size={12} /> : <Lock size={12} />}
                      {isLessonPublic(selectedLesson) ? "Công khai" : "Riêng tư"}
                    </span>
                    {selectedLesson.Status && (
                      <span className="text-[11px] px-2 py-1 rounded-full border text-muted-foreground">
                        {selectedLesson.Status}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <UserCircle2 size={14} /> {selectedLesson.CreatedBy || "Hệ thống"}
                  </div>
                </div>
                <button
                  className="p-2 rounded-full hover:bg-muted"
                  onClick={() => setSelectedLesson(null)}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
                <div className="text-sm whitespace-pre-line">{selectedLesson.Content}</div>

                {selectedLesson.AttachmentUrl && (
                  <div className="pt-2 border-t flex flex-wrap gap-3">
                    <a
                      href={selectedLesson.AttachmentUrl}
                      target="_blank"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted text-sm"
                    >
                      <Eye size={16} /> Xem tệp đính kèm
                    </a>
                    <a
                      href={`${apiUrl("/api/files/download")}?src=${encodeURIComponent(selectedLesson.AttachmentUrl)}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted text-sm"
                    >
                      <Download size={16} /> Tải về
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}