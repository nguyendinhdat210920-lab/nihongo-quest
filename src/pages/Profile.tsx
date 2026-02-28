import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';

interface ProfileData {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;

  useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    const headers = { "x-user": encodeURIComponent(activeUser) };
    axios
      .get<ProfileData>(apiUrl("/api/profile"), { headers })
      .then((r) => {
        setProfile(r.data);
        setEmail(r.data.email || "");
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Không thể tải hồ sơ.");
      })
      .finally(() => setLoading(false));
  }, [activeUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await axios.put(
        apiUrl("/api/profile"),
        { email: email.trim() || null, newPassword: newPassword.trim() || undefined },
        { headers: { "x-user": encodeURIComponent(activeUser) } }
      );
      setSuccess(true);
      setNewPassword("");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.message
        ? err.response.data.message
        : "Không thể cập nhật hồ sơ.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto glass-card p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Vui lòng đăng nhập</h2>
          <p className="text-muted-foreground mb-4">Bạn cần đăng nhập để xem và chỉnh sửa hồ sơ.</p>
          <Link to="/login" className="gradient-bg text-primary-foreground px-6 py-2.5 rounded-xl font-medium inline-block">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Đang tải hồ sơ...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto glass-card p-8 text-center">
          <AlertCircle className="mx-auto text-destructive mb-2" size={32} />
          <p className="text-destructive mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold font-jp mb-8">Hồ sơ cá nhân</h1>

        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center text-3xl text-primary-foreground font-bold">
              {(profile?.username || activeUser)[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.username || activeUser}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email || "Chưa có email"}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold mb-4">Cập nhật thông tin</h3>
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle size={16} /> {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600">Đã lưu thay đổi.</p>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tên đăng nhập</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={profile?.username || ""}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-muted/50 text-muted-foreground text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Không thể đổi tên đăng nhập</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Đổi mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Để trống nếu không đổi"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ít nhất 6 ký tự</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="gradient-bg text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
