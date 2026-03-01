import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Search, Download, Upload, Trash2, Eye, AlertCircle } from "lucide-react";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import { currentUser } from "@/lib/mockData";

interface MaterialItem {
  id: number;
  title: string;
  course: string | null;
  tags: string[];
  fileUrl: string | null;
  fileType: string | null;
  uploaderName: string | null;
  status: string | null;
  createdAt: string;
}

export default function Materials() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<MaterialItem[]>(
        apiUrl("/api/materials"),
      );
      setMaterials(res.data);
    } catch (err) {
      console.error("Failed to fetch materials", err);
      setError("Không thể tải danh sách tài liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const form = new FormData();
      form.append("title", title.trim());
      if (course.trim()) form.append("course", course.trim());
      if (tagsText.trim()) form.append("tags", tagsText.trim());
      if (file) form.append("file", file);

      const activeUser = localStorage.getItem("username") || currentUser.username;
      const encodedUser = encodeURIComponent(activeUser);
      await axios.post(apiUrl("/api/materials"), form, {
        headers: {
          "x-user": encodedUser,
        },
      });

      setTitle("");
      setCourse("");
      setTagsText("");
      setFile(null);
      fetchMaterials();
    } catch (err) {
      console.error("Failed to create material", err);
      setError("Không thể upload tài liệu. Hãy thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("Bạn có chắc muốn xóa tài liệu này?");
    if (!ok) return;
    try {
      const activeUser = localStorage.getItem("username") || currentUser.username;
      const encodedUser = encodeURIComponent(activeUser);
      await axios.delete(apiUrl(`/api/materials/${id}`), {
        headers: {
          "x-user": encodedUser,
        },
      });
      fetchMaterials();
    } catch (err) {
      console.error("Failed to delete material", err);
      setError("Không thể xóa tài liệu.");
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = materials.filter((m) => {
    if (!normalizedSearch) return true;
    const inTitle = m.title.toLowerCase().includes(normalizedSearch);
    const inCourse = (m.course || "").toLowerCase().includes(normalizedSearch);
    const inTags = (m.tags || []).some((t) =>
      t.toLowerCase().includes(normalizedSearch),
    );
    return inTitle || inCourse || inTags;
  });

  const activeUser =
    (typeof window !== "undefined" && localStorage.getItem("username")) ||
    currentUser.username;
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-jp flex items-center gap-2">
              <FileText className="text-accent" /> Tài liệu
            </h1>
            <p className="text-muted-foreground mt-1">
              Kho tài liệu – upload và tải file PDF, ảnh, tài liệu học tiếng Nhật
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] gap-6">
          <div>
            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tài liệu theo tên, khóa học hoặc tag..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>

            {loading && (
              <p className="text-muted-foreground">Đang tải tài liệu...</p>
            )}
            {error && (
              <p className="text-sm text-destructive mb-2 flex items-center gap-1">
                <AlertCircle size={16} /> {error}
              </p>
            )}

            <div className="space-y-3">
              {filtered.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-bold text-sm uppercase">
                    {m.fileType || "FILE"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{m.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {m.course || "Khóa học khác"} • bởi{" "}
                      {m.uploaderName || "Không rõ"}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.tags?.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {m.fileUrl && (
                      <>
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1 text-xs"
                        >
                          <Eye size={16} />
                          Xem
                        </a>
                        <a
                          href={`${apiUrl("/api/files/download")}?src=${encodeURIComponent(m.fileUrl)}`}
                          className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1 text-xs"
                        >
                          <Download size={16} />
                          Tải
                        </a>
                      </>
                    )}
                    {(m.uploaderName === activeUser || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="p-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Xóa tài liệu"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {!loading && !filtered.length && (
                <p className="text-muted-foreground text-sm">
                  Không có tài liệu nào phù hợp với từ khóa tìm kiếm.
                </p>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Upload size={18} className="text-accent" />
              Upload tài liệu mới
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Tiêu đề</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ví dụ: JLPT N5 Grammar Summary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Khóa học / Chủ đề</label>
                <input
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ví dụ: JLPT N5, Kanji..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Tags (phân cách bằng dấu phẩy)
                </label>
                <input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ví dụ: grammar, N5, beginner"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  File (PDF / ảnh / tài liệu khác)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*,.doc,.docx,.ppt,.pptx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full gradient-accent-bg text-accent-foreground px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <Upload size={16} />
                {submitting ? "Đang upload..." : "Lưu tài liệu"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
