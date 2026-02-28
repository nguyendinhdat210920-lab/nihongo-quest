import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ThumbsUp, MessageCircle, Plus, X, Loader2, Paperclip, FileText, Check, Ban, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { apiUrl, getAuthHeaders } from '@/lib/api';

interface Post {
  id: number;
  authorName: string;
  authorIsAdmin?: boolean;
  title: string;
  content: string;
  likes: number;
  commentCount: number;
  createdAt: string;
  liked?: boolean;
  status?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}

interface Comment {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function Forum() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailPost, setDetailPost] = useState<{ post: Post; comments: Comment[] } | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const username = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
  const isAdmin = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') === 'true' : false;

  const fetchPosts = async (pageNum = page) => {
    try {
      setLoading(true);
      setError(null);
      setPage(pageNum);
      const params: Record<string, string | number> = { page: pageNum, limit };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await axios.get(apiUrl('/api/forum/posts'), {
        headers: getAuthHeaders(),
        params,
      });
      const data = res.data;
      setPosts(data.posts || []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
      if (isAdmin) {
        try {
          const pendingRes = await axios.get(apiUrl('/api/forum/posts/pending'), { headers: getAuthHeaders() });
          setPendingPosts(pendingRes.data || []);
        } catch {
          setPendingPosts([]);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải bài viết');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  }, []);

  const searchInitialized = useRef(false);
  useEffect(() => {
    if (!searchInitialized.current) {
      searchInitialized.current = true;
      return;
    }
    setPage(1);
    fetchPosts(1);
  }, [searchQuery]);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(p, totalPages));
    setPage(next);
    fetchPosts(next);
  };

  const handleLike = async (id: number) => {
    if (!username) return;
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const prevLikes = post.likes;
    const prevLiked = post.liked;
    setPosts(posts.map((p) => (p.id === id ? { ...p, likes: prevLiked ? prevLikes - 1 : prevLikes + 1, liked: !prevLiked } : p)));
    if (detailPost?.post.id === id) {
      setDetailPost({
        ...detailPost,
        post: { ...detailPost.post, likes: prevLiked ? prevLikes - 1 : prevLikes + 1, liked: !prevLiked },
      });
    }
    try {
      const res = await axios.post(apiUrl(`/api/forum/posts/${id}/like`), {}, { headers: getAuthHeaders() });
      setPosts(posts.map((p) => (p.id === id ? { ...p, likes: res.data.likes, liked: res.data.liked } : p)));
      if (detailPost?.post.id === id) {
        setDetailPost({ ...detailPost, post: { ...detailPost.post, likes: res.data.likes, liked: res.data.liked } });
      }
    } catch {
      setPosts(posts.map((p) => (p.id === id ? { ...p, likes: prevLikes, liked: prevLiked } : p)));
      if (detailPost?.post.id === id) {
        setDetailPost({ ...detailPost, post: { ...detailPost.post, likes: prevLikes, liked: prevLiked } });
      }
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !createContent.trim()) return;
    try {
      setCreateLoading(true);
      setCreateError(null);
      const formData = new FormData();
      formData.append('title', createTitle.trim());
      formData.append('content', createContent.trim());
      if (createFile) formData.append('file', createFile);
      const res = await axios.post(apiUrl('/api/forum/posts'), formData, {
        headers: getAuthHeaders(),
      });
      if (res.data.status === 'approved') {
        setPage(1);
        fetchPosts(1);
      } else if (isAdmin) {
        setPendingPosts((prev) => [res.data, ...prev]);
      }
      if (res.data.status === 'pending') {
        toast.info('Bài viết của bạn đang chờ admin duyệt. Bạn sẽ thấy bài viết khi được phê duyệt.');
      }
      setShowCreate(false);
      setCreateTitle('');
      setCreateContent('');
      setCreateFile(null);
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Không thể đăng bài');
    } finally {
      setCreateLoading(false);
    }
  };

  const openDetail = async (post: Post) => {
    try {
      const res = await axios.get(apiUrl(`/api/forum/posts/${post.id}`), { headers: getAuthHeaders() });
      setDetailPost({ post: { ...res.data.post, liked: post.liked }, comments: res.data.comments || [] });
    } catch {
      setDetailPost(null);
    }
  };

  const handleApprovePost = async (id: number) => {
    try {
      await axios.put(apiUrl(`/api/forum/posts/${id}/status`), { status: 'approved' }, { headers: getAuthHeaders() });
      setPendingPosts((prev) => prev.filter((p) => p.id !== id));
      fetchPosts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể duyệt');
    }
  };

  const handleRejectPost = async (id: number) => {
    try {
      await axios.put(apiUrl(`/api/forum/posts/${id}/status`), { status: 'rejected' }, { headers: getAuthHeaders() });
      setPendingPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể từ chối');
    }
  };

  const handleDeletePost = async () => {
    if (!detailPost || !username || detailPost.post.authorName !== username) return;
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      setDeleteLoading(true);
      await axios.delete(apiUrl(`/api/forum/posts/${detailPost.post.id}`), { headers: getAuthHeaders() });
      setPosts((prev) => prev.filter((p) => p.id !== detailPost.post.id));
      setDetailPost(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể xóa');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailPost || !commentContent.trim() || !username) return;
    try {
      setCommentLoading(true);
      const res = await axios.post(
        apiUrl(`/api/forum/posts/${detailPost.post.id}/comments`),
        { content: commentContent.trim() },
        { headers: getAuthHeaders() }
      );
      setDetailPost({
        ...detailPost,
        comments: [...detailPost.comments, res.data],
        post: { ...detailPost.post, commentCount: detailPost.post.commentCount + 1 },
      });
      setPosts(posts.map((p) => (p.id === detailPost.post.id ? { ...p, commentCount: p.commentCount + 1 } : p)));
      setCommentContent('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể thêm bình luận');
    } finally {
      setCommentLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      const date = new Date(d);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      if (diff < 60000) return 'Vừa xong';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
      return date.toLocaleDateString('vi-VN');
    } catch {
      return d;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-jp flex items-center gap-2">
              <MessageSquare className="text-primary" /> Diễn đàn
            </h1>
            <p className="text-muted-foreground mt-1">Trao đổi, hỏi đáp cùng cộng đồng</p>
          </div>
          <button
            onClick={() => (username ? setShowCreate(true) : toast.error('Vui lòng đăng nhập để đăng bài'))}
            className="gradient-bg text-primary-foreground px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={18} /> Đăng bài
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        {!loading && (
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Tìm bài viết theo tiêu đề hoặc nội dung..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium"
            >
              Tìm
            </button>
          </div>
        )}

        {isAdmin && pendingPosts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
              <MessageCircle size={18} /> Bài chờ duyệt ({pendingPosts.length})
            </h3>
            <div className="space-y-3">
              {pendingPosts.map((p) => (
                <div key={p.id} className="p-3 rounded-lg bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">bởi {p.authorName}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprovePost(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                    >
                      <Check size={14} /> Duyệt
                    </button>
                    <button
                      onClick={() => handleRejectPost(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm hover:opacity-90"
                    >
                      <Ban size={14} /> Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có bài viết nào. Hãy là người đầu tiên đăng bài!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>{searchQuery ? `Không tìm thấy bài viết phù hợp với "${searchQuery}"` : 'Chưa có bài viết nào. Hãy là người đầu tiên đăng bài!'}</p>
              </div>
            ) : (
              posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                onClick={() => openDetail(post)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {(post.authorName || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      {post.authorName}
                      {post.authorIsAdmin && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/90 text-white">ADMIN</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2 font-jp">{post.title}</h3>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{post.content}</p>
                {post.fileUrl && (
                  <a href={post.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4" onClick={(e) => e.stopPropagation()}>
                    <FileText size={14} /> {post.fileName || 'Tệp đính kèm'}
                  </a>
                )}
                {!post.fileUrl && <div className="mb-4" />}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                    className={`flex items-center gap-1 transition-colors ${post.liked ? 'text-primary' : 'hover:text-accent'}`}
                  >
                    <ThumbsUp size={15} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDetail(post); }}
                    className="flex items-center gap-1 hover:text-accent transition-colors cursor-pointer"
                  >
                    <MessageCircle size={15} /> {post.commentCount}
                  </button>
                </div>
              </motion.div>
            ))
            )}
            {posts.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                <span className="px-3 py-1.5 text-sm text-muted-foreground">
                  Trang {page} / {totalPages} ({total} bài)
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Create post modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Đăng bài mới</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-muted rounded">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="Nhập tiêu đề..."
                    className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Nội dung</label>
                  <textarea
                    value={createContent}
                    onChange={(e) => setCreateContent(e.target.value)}
                    placeholder="Viết nội dung bài viết..."
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Tệp đính kèm (tùy chọn, tối đa 10MB)</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-input bg-background cursor-pointer hover:bg-muted/50 transition-colors text-sm">
                      <Paperclip size={16} />
                      {createFile ? createFile.name : 'Chọn file'}
                      <input type="file" className="hidden" onChange={(e) => setCreateFile(e.target.files?.[0] || null)} />
                    </label>
                    {createFile && (
                      <button type="button" onClick={() => setCreateFile(null)} className="text-sm text-muted-foreground hover:text-destructive">
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl border">
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading || !createTitle.trim() || !createContent.trim()}
                    className="gradient-bg text-primary-foreground px-4 py-2 rounded-xl font-medium disabled:opacity-60 flex items-center gap-2"
                  >
                    {createLoading && <Loader2 size={16} className="animate-spin" />}
                    Đăng
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post detail modal */}
      <AnimatePresence>
        {detailPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setDetailPost(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold">
                    {(detailPost.post.authorName || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-1.5">
                      {detailPost.post.authorName}
                      {detailPost.post.authorIsAdmin && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/90 text-white">ADMIN</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(detailPost.post.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {username && (detailPost.post.authorName === username || isAdmin) && (
                    <button
                      onClick={handleDeletePost}
                      disabled={deleteLoading}
                      className="p-1.5 hover:bg-destructive/20 text-destructive rounded"
                      title="Xóa bài viết"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button onClick={() => setDetailPost(null)} className="p-1 hover:bg-muted rounded">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <h2 className="text-xl font-bold font-jp mb-2">{detailPost.post.title}</h2>
              <p className="text-muted-foreground mb-2 whitespace-pre-wrap">{detailPost.post.content}</p>
              {detailPost.post.fileUrl && (
                <a href={detailPost.post.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
                  <FileText size={18} /> {detailPost.post.fileName || 'Tệp đính kèm'}
                </a>
              )}
              {!detailPost.post.fileUrl && <div className="mb-4" />}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <button
                  onClick={() => handleLike(detailPost.post.id)}
                  className={`flex items-center gap-1 transition-colors ${detailPost.post.liked ? 'text-primary' : 'hover:text-accent'}`}
                >
                  <ThumbsUp size={15} fill={detailPost.post.liked ? 'currentColor' : 'none'} /> {detailPost.post.likes}
                </button>
                <span className="flex items-center gap-1">
                  <MessageCircle size={15} /> {detailPost.post.commentCount} bình luận
                </span>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Bình luận</h3>
                {username && (
                  <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Viết bình luận..."
                      className="flex-1 px-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="submit"
                      disabled={commentLoading || !commentContent.trim()}
                      className="px-4 py-2 rounded-xl gradient-bg text-primary-foreground font-medium disabled:opacity-60"
                    >
                      {commentLoading ? <Loader2 size={16} className="animate-spin" /> : 'Gửi'}
                    </button>
                  </form>
                )}
                <div className="space-y-3">
                  {detailPost.comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có bình luận nào.</p>
                  ) : (
                    detailPost.comments.map((c) => (
                      <div key={c.id} className="flex gap-3 p-3 rounded-xl bg-muted/50">
                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                          {(c.authorName || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.authorName}</p>
                          <p className="text-sm text-muted-foreground">{c.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(c.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
