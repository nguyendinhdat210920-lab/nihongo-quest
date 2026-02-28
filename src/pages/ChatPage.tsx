import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Users, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { apiUrl, getAuthHeaders } from '@/lib/api';

interface ChatMessage {
  id: number;
  username: string;
  message: string;
  createdAt: string;
  isAdmin?: boolean;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const username = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
  const isAdmin = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') === 'true' : false;

  const fetchMessages = useCallback(async (sinceId?: number) => {
    try {
      const params = sinceId ? { sinceId } : {};
      const res = await axios.get(apiUrl('/api/chat/messages'), { params });
      const newMsgs = res.data || [];
      if (sinceId) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const added = newMsgs.filter((m: ChatMessage) => !ids.has(m.id));
          return added.length ? [...prev, ...added] : prev;
        });
      } else {
        setMessages(newMsgs);
      }
      setError(null);
    } catch (err: any) {
      if (!sinceId) {
        setError(err?.response?.data?.message || 'Không thể tải tin nhắn');
        setMessages([]);
      }
    } finally {
      if (!sinceId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      const lastId = messages.length ? Math.max(...messages.map((m) => m.id)) : 0;
      if (lastId > 0) fetchMessages(lastId);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    if (!username) {
      toast.error('Vui lòng đăng nhập để gửi tin nhắn');
      return;
    }
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const res = await axios.post(
        apiUrl('/api/chat/messages'),
        { message: text },
        { headers: getAuthHeaders() }
      );
      setMessages((prev) => [...prev, res.data]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gửi tin nhắn');
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const clearAllMessages = async () => {
    if (!isAdmin || !window.confirm('Xóa tất cả tin nhắn? Hành động không thể hoàn tác.')) return;
    setDeleting(true);
    try {
      await axios.delete(apiUrl('/api/chat/messages'), { headers: getAuthHeaders() });
      setMessages([]);
      toast.success('Đã xóa tất cả tin nhắn');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể xóa tin nhắn');
    } finally {
      setDeleting(false);
    }
  };

  const TZ_VIETNAM = 'Asia/Ho_Chi_Minh';

  const formatTime = (d: string) => {
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      const opts: Intl.DateTimeFormatOptions = { timeZone: TZ_VIETNAM };
      const timeStr = date.toLocaleTimeString('vi-VN', { ...opts, hour: '2-digit', minute: '2-digit' });
      const toDateKey = (dt: Date) => {
        const p = new Intl.DateTimeFormat('vi-VN', { ...opts, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(dt);
        return `${p.find((x) => x.type === 'year')!.value}-${p.find((x) => x.type === 'month')!.value}-${p.find((x) => x.type === 'day')!.value}`;
      };
      const vnKey = toDateKey(date);
      const todayKey = toDateKey(new Date());
      if (vnKey === todayKey) return `Hôm nay ${timeStr}`;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (vnKey === toDateKey(yesterday)) return `Hôm qua ${timeStr}`;
      return `${date.toLocaleDateString('vi-VN', { ...opts, day: '2-digit', month: '2-digit' })} ${timeStr}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold font-jp">💬 Phòng chat chung</h1>
        <div className="flex items-center gap-2">
          {isAdmin && messages.length > 0 && (
            <button
              type="button"
              onClick={clearAllMessages}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              title="Xóa tất cả tin nhắn"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Xóa tất cả
            </button>
          )}
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users size={14} /> {username ? 'Đã đăng nhập' : 'Chưa đăng nhập'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="flex-1 glass-card p-4 overflow-y-auto scrollbar-hide space-y-3 mb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Chưa có tin nhắn nào. Hãy là người đầu tiên gửi tin nhắn!</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.username === username;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isMe ? 'gradient-bg text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {(m.username || '?')[0].toUpperCase()}
                </div>
                <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                  <p className={`text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5 flex-wrap ${isMe ? 'justify-end' : ''}`}>
                    {formatTime(m.createdAt) && <span>{formatTime(m.createdAt)}</span>}
                    <span className="flex items-center gap-1.5">
                      {m.username}
                      {(m.isAdmin || (isMe && isAdmin)) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/90 text-white" title="Admin">
                          ADMIN
                        </span>
                      )}
                    </span>
                  </p>
                  <div
                    className={`inline-block px-3 py-2 rounded-2xl text-sm ${
                      isMe ? 'gradient-bg text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={username ? 'Nhập tin nhắn...' : 'Đăng nhập để gửi tin nhắn'}
          disabled={!username}
          className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={!username || !input.trim() || sending}
          className="gradient-bg text-primary-foreground p-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center min-w-[44px]"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
