import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';

export default function Register() {
  const [showPw, setShowPw] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await axios.post(apiUrl('/api/auth/register'), {
        username: username.trim(),
        email: email.trim() || null,
        password,
      });

      setSuccess('Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.');
      setPassword('');

      // Small delay so user sees the success state
      setTimeout(() => navigate('/login'), 700);
    } catch (err: any) {
      console.error('Register failed', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 409
          ? 'Username đã tồn tại, hãy chọn tên khác.'
          : 'Đăng ký thất bại. Hãy thử lại.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 hero-gradient">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <span className="text-4xl">🌸</span>
          <h1 className="text-2xl font-bold font-jp mt-2">Đăng ký</h1>
          <p className="text-sm text-muted-foreground mt-1">Bắt đầu hành trình học tiếng Nhật!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tên đăng nhập</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ví dụ: Đình Đạt"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
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
            <label className="text-sm font-medium mb-1.5 block">Mật khẩu</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-bg text-primary-foreground py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">Đăng nhập</Link>
        </p>
      </motion.div>
    </div>
  );
}
