import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, TrendingUp, Flame, Trophy, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl, getAuthHeaders } from '@/lib/api';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  attempts: number;
}

interface Badge {
  id: string;
  name: string;
  criteria: string;
}

interface UserStats {
  totalWords: number;
  totalQuizzes: number;
  totalPoints: number;
  avgScore: number;
  streak: number;
  badges: (string | Badge)[];
  weeklyProgress?: { day: string; words: number; quizzes: number }[];
  monthlyScores?: { month: string; score: number }[];
}

const defaultStats: UserStats = {
  totalWords: 0,
  totalQuizzes: 0,
  totalPoints: 0,
  avgScore: 0,
  streak: 0,
  badges: [],
  weeklyProgress: [{ day: "T2", words: 0, quizzes: 0 }, { day: "T3", words: 0, quizzes: 0 }, { day: "T4", words: 0, quizzes: 0 }, { day: "T5", words: 0, quizzes: 0 }, { day: "T6", words: 0, quizzes: 0 }, { day: "T7", words: 0, quizzes: 0 }, { day: "CN", words: 0, quizzes: 0 }],
  monthlyScores: [{ month: "T1", score: 0 }],
};

export default function Dashboard() {
  const username =
    (typeof window !== "undefined" && localStorage.getItem("username")) || "";
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get<LeaderboardEntry[]>(apiUrl("/api/leaderboard")).then((r) => setLeaderboard(r.data || [])).catch(() => {});
  }, []);

  const fetchStats = () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    axios
      .get<UserStats>(apiUrl("/api/dashboard/stats"), { headers: getAuthHeaders() })
      .then((r) => setStats(r.data || defaultStats))
      .catch((err) => {
        setError(err?.response?.data?.message || "Không thể tải thống kê");
        setStats(defaultStats);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }
    fetchStats();
  }, [username]);

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-jp mb-2">{(() => {
          const h = new Date().getHours();
          const greet = h < 10 ? "おはよう" : h < 18 ? "こんにちは" : "こんばんは";
          return <>{greet}、<span className="gradient-text">{username || "bạn"}</span>!</>;
        })()}</h1>
        <p className="text-muted-foreground mb-8">Hãy tiếp tục hành trình học tiếng Nhật nhé 🌸</p>
        <div className="mb-4 flex items-center gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && <p className="text-sm text-muted-foreground">Đang tải thống kê...</p>}
          {username && (
            <button
              type="button"
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          [
            { label: 'Tổng điểm', value: stats.totalPoints?.toLocaleString() ?? '0', icon: Trophy, color: 'text-primary' },
            { label: 'Từ đã học', value: stats.totalWords, icon: BookOpen, color: 'text-secondary' },
            { label: 'Điểm TB', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'text-accent' },
            { label: 'Streak', value: `${stats.streak} ngày`, icon: Flame, color: 'text-destructive' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5"
            >
              <s.icon size={24} className={s.color + ' mb-2'} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Progress */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Tiến độ 7 ngày qua</h3>
          {loading ? (
            <Skeleton className="w-full h-[250px] rounded-lg" />
          ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.weeklyProgress || defaultStats.weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 12 }} />
              <Bar dataKey="quizzes" fill="hsl(187, 86%, 53%)" radius={[6, 6, 0, 0]} name="Số lần làm quiz" />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Monthly Scores */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Điểm trung bình theo tháng</h3>
          {loading ? (
            <Skeleton className="w-full h-[250px] rounded-lg" />
          ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.monthlyScores || defaultStats.monthlyScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="hsl(330, 81%, 70%)" strokeWidth={2.5} dot={{ fill: 'hsl(330, 81%, 70%)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Badges */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Trophy size={18} className="text-secondary" />Danh hiệu</h3>
          <div className="space-y-3">
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          ) : stats.badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.badges.map((b) => {
                const badge = typeof b === 'string' ? { id: b, name: b, criteria: '' } : b;
                return (
                  <span
                    key={badge.id}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                    title={badge.criteria}
                  >
                    {badge.name}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Đạt điểm cao, học Flashcards, đăng bài diễn đàn để nhận danh hiệu!</p>
          )}
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Xem tất cả danh hiệu có thể đạt</summary>
              <ul className="mt-2 space-y-1 pl-4 list-disc">
                <li>🎯 50/100/250/500/1000/2500/5000 điểm — Mỗi câu đúng = 1 điểm</li>
                <li>🔥 3/7/30/100 ngày liên tiếp — Làm quiz mỗi ngày</li>
                <li>📚 10/50/100/500/1000 từ — Thuộc thẻ flashcard</li>
                <li>⭐ 70/80/90% — Điểm trung bình cao</li>
                <li>💯 100% — Điểm tuyệt đối 1 hoặc 5 lần</li>
                <li>💬 1/5/10 bài — Đăng bài lên diễn đàn</li>
                <li>💭 5/20 bình luận — Viết bình luận</li>
                <li>📖 1/5 bài học — Tạo bài học</li>
              </ul>
            </details>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Trophy size={18} className="text-accent" />Bảng xếp hạng</h3>
            <Link to="/leaderboard" className="text-xs text-primary hover:underline">Xem tất cả</Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu. Làm Quiz để lên bảng!</p>
            ) : (
              leaderboard.map(l => (
                <div key={l.username + l.rank} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm ${l.username === username ? 'bg-primary/10' : ''}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${l.rank <= 3 ? 'gradient-bg text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {l.rank}
                  </span>
                  <span className="flex-1 font-medium">{l.username}</span>
                  <span className="text-muted-foreground">{l.score.toLocaleString()} điểm</span>
                  <span className="text-xs">🔥{l.attempts}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
