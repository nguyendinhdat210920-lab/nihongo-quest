import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, BarChart3, Ban, CheckCircle, UserCog, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { apiUrl } from '@/lib/api';

type AdminUser = {
  id: number;
  username: string;
  email: string | null;
  isBanned: boolean;
  isAdmin?: boolean;
  createdAt: string;
};

type AdminStats = {
  totalUsers: number;
  totalLessons: number;
  totalMaterials: number;
  totalQuizzes: number;
  totalQuizResults: number;
  demoLessonsCount?: number;
  demoQuizzesCount?: number;
};

const tabs = [
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'stats', label: 'Thống kê', icon: BarChart3 },
];

export default function Admin() {
  const [tab, setTab] = useState<'users' | 'stats'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingDemo, setDeletingDemo] = useState(false);
  const [deletingQuizDemo, setDeletingQuizDemo] = useState(false);

  const activeUsername =
    typeof window !== 'undefined'
      ? localStorage.getItem('username') || 'Admin'
      : 'Admin';

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);

    const username =
      typeof window !== 'undefined'
        ? localStorage.getItem('username') || ''
        : '';
    const encoded = encodeURIComponent(username);
    const headers = { 'x-user': encoded };

    try {
      const [usersRes, statsRes] = await Promise.allSettled([
        axios.get<AdminUser[]>(apiUrl('/api/admin/users'), { headers }),
        axios.get<AdminStats>(apiUrl('/api/admin/stats'), { headers }),
      ]);

      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data);
      else {
        console.error('Users API failed:', usersRes.reason);
        setUsers([]);
      }

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      else setStats(null);

      const errs = [usersRes, statsRes]
        .filter((r) => r.status === 'rejected')
        .map((r) => (r as PromiseRejectedResult).reason?.response?.data?.message || (r as PromiseRejectedResult).reason?.message);
      if (errs.length > 0) {
        setError('Không thể tải dữ liệu admin. ' + (errs[0] || 'Kiểm tra server đang chạy và đã đăng nhập.'));
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
      setError('Không thể tải dữ liệu admin. Kiểm tra server (port 3000) và kết nối DB.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const toggleAdmin = async (user: AdminUser) => {
    if (user.username === activeUsername) {
      setError('Bạn không thể thu hồi quyền admin của chính mình.');
      return;
    }
    const confirmText = user.isAdmin
      ? `Thu hồi quyền admin của "${user.username}"?`
      : `Cấp quyền admin cho "${user.username}"?`;
    if (!window.confirm(confirmText)) return;

    try {
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
      const encoded = encodeURIComponent(username);
      setError(null);
      await axios.patch(
        apiUrl(`/api/admin/users/${user.id}/admin`),
        { isAdmin: !user.isAdmin },
        { headers: { 'x-user': encoded } },
      );
      fetchAdminData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể cập nhật quyền admin.');
    }
  };

  const deleteDemoQuizzes = async () => {
    if (!window.confirm('Xóa tất cả quiz demo (@system)? Hành động không thể hoàn tác.')) return;
    setDeletingQuizDemo(true);
    try {
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
      const res = await axios.delete(apiUrl('/api/admin/quizzes/demo'), {
        headers: { 'x-user': encodeURIComponent(username) },
      });
      toast.success(res.data?.message || 'Đã xóa quiz demo');
      fetchAdminData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể xóa quiz demo');
    } finally {
      setDeletingQuizDemo(false);
    }
  };

  const deleteDemoLessons = async () => {
    if (!window.confirm('Xóa tất cả bài học demo (@system)? Hành động không thể hoàn tác.')) return;
    setDeletingDemo(true);
    try {
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
      const res = await axios.delete(apiUrl('/api/admin/lessons/demo'), {
        headers: { 'x-user': encodeURIComponent(username) },
      });
      toast.success(res.data?.message || 'Đã xóa bài học demo');
      fetchAdminData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể xóa bài học demo');
    } finally {
      setDeletingDemo(false);
    }
  };

  const toggleBan = async (user: AdminUser) => {
    if (user.username === activeUsername) {
      setError('Bạn không thể tự khóa tài khoản của mình.');
      return;
    }

    const confirmText = user.isBanned
      ? `Mở khóa tài khoản "${user.username}"?`
      : `Khóa tài khoản "${user.username}"?`;
    if (!window.confirm(confirmText)) return;

    try {
      const username =
        typeof window !== 'undefined'
          ? localStorage.getItem('username') || ''
          : '';
      const encoded = encodeURIComponent(username);

      const endpoint = user.isBanned ? 'unban' : 'ban';
      await axios.patch(
        apiUrl(`/api/admin/users/${user.id}/${endpoint}`),
        {},
        {
          headers: { 'x-user': encoded },
        },
      );

      setError(null);
      fetchAdminData();
    } catch (err) {
      console.error('Failed to toggle ban', err);
      setError('Không thể cập nhật trạng thái user, hãy thử lại.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold font-jp flex items-center gap-2">
            <Shield className="text-primary" /> Admin Panel
          </h1>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm">
            <Shield size={16} />
            <span>{activeUsername}</span>
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              ADMIN
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'gradient-bg text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && (
          <p className="text-sm text-muted-foreground">
            Đang tải dữ liệu admin...
          </p>
        )}

        {!loading && tab === 'users' && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Username</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Trạng thái</th>
                    <th className="text-left p-3 font-medium">Admin</th>
                    <th className="text-left p-3 font-medium">Ngày tạo</th>
                    <th className="text-left p-3 font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-3 font-medium flex items-center gap-2">
                        {u.username}
                        {u.isAdmin && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-semibold">ADMIN</span>
                        )}
                        {u.username === activeUsername && (
                          <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">BẠN</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {u.email || '—'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                            u.isBanned
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-green-500/10 text-green-600'
                          }`}
                        >
                          {u.isBanned ? 'Bị khóa' : 'Đang hoạt động'}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.username === activeUsername ? (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600">Bạn</span>
                        ) : (
                          <button
                            className="flex items-center gap-1 text-xs hover:underline"
                            onClick={() => toggleAdmin(u)}
                          >
                            <UserCog size={12} />
                            {u.isAdmin ? 'Thu hồi admin' : 'Cấp admin'}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="p-3">
                        <button
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-1 text-xs"
                          onClick={() => toggleBan(u)}
                        >
                          {u.isBanned ? (
                            <>
                              <CheckCircle size={14} />
                              Mở khóa
                            </>
                          ) : (
                            <>
                              <Ban size={14} />
                              Khóa
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!users.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-4 text-center text-sm text-muted-foreground"
                      >
                        Chưa có user nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && tab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Tổng users', value: stats.totalUsers },
                { label: 'Bài học', value: stats.totalLessons },
                { label: 'Tài liệu', value: stats.totalMaterials },
                { label: 'Quiz', value: stats.totalQuizzes },
              ].map((s) => (
                <div key={s.label} className="glass-card p-5 text-center">
                  <p className="text-2xl font-bold gradient-text">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            {((stats.demoLessonsCount ?? 0) > 0 || (stats.demoQuizzesCount ?? 0) > 0) && (
              <div className="glass-card p-4">
                <p className="text-sm text-muted-foreground mb-2">Công cụ</p>
                <div className="flex flex-wrap gap-2">
                  {(stats.demoLessonsCount ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={deleteDemoLessons}
                      disabled={deletingDemo}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      {deletingDemo ? 'Đang xóa...' : <><Trash2 size={16} /> Xóa bài học demo</>}
                    </button>
                  )}
                  {(stats.demoQuizzesCount ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={deleteDemoQuizzes}
                      disabled={deletingQuizDemo}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      {deletingQuizDemo ? 'Đang xóa...' : <><Trash2 size={16} /> Xóa quiz demo</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
