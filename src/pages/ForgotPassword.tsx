import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      const res = await axios.post(apiUrl('/api/auth/forgot-password'), { email: email.trim() });
      setSent(true);
      if (res.data?.resetLink) {
        setResetLink(res.data.resetLink);
        toast.success('Kiểm tra link bên dưới để đặt lại mật khẩu');
      } else {
        toast.info(res.data?.message || 'Vui lòng kiểm tra email của bạn');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 hero-gradient">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <span className="text-4xl">✉️</span>
            <h1 className="text-2xl font-bold font-jp mt-2">Kiểm tra email</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.
            </p>
          </div>
          {resetLink && (
            <div className="mb-6 p-4 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Link đặt lại mật khẩu (hiệu lực 1 giờ):</p>
              <a
                href={resetLink}
                className="text-sm text-primary break-all hover:underline"
              >
                {resetLink}
              </a>
              <p className="text-xs text-muted-foreground mt-2">Bấm vào link trên hoặc copy dán vào trình duyệt.</p>
            </div>
          )}
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft size={16} /> Quay lại đăng nhập
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 hero-gradient">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <span className="text-4xl">🔑</span>
          <h1 className="text-2xl font-bold font-jp mt-2">Quên mật khẩu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nhập email đăng ký để nhận link đặt lại mật khẩu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email đăng ký</label>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-bg text-primary-foreground py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-primary hover:underline flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Quay lại đăng nhập
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
