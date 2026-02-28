import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      toast.error('Link đặt lại mật khẩu không hợp lệ');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      await axios.post(apiUrl('/api/auth/reset-password'), {
        token,
        newPassword,
      });
      setSuccess(true);
      toast.success('Đặt lại mật khẩu thành công');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 hero-gradient">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 w-full max-w-md text-center"
        >
          <span className="text-5xl">✅</span>
          <h1 className="text-2xl font-bold font-jp mt-4">Đặt lại mật khẩu thành công!</h1>
          <p className="text-muted-foreground mt-2">Đang chuyển đến trang đăng nhập...</p>
          <Link to="/login" className="inline-block mt-6 text-primary hover:underline">
            Đăng nhập ngay
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 hero-gradient">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 w-full max-w-md text-center"
        >
          <span className="text-4xl">❌</span>
          <h1 className="text-xl font-bold mt-4">Link không hợp lệ</h1>
          <p className="text-muted-foreground mt-2">Vui lòng yêu cầu link đặt lại mật khẩu mới.</p>
          <Link to="/forgot-password" className="inline-block mt-6 text-primary hover:underline">
            Quên mật khẩu
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
          <span className="text-4xl">🔐</span>
          <h1 className="text-2xl font-bold font-jp mt-2">Đặt lại mật khẩu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nhập mật khẩu mới của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Mật khẩu mới</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Xác nhận mật khẩu</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-bg text-primary-foreground py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
