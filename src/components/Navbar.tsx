import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Home, Layers, HelpCircle, FileText, MessageSquare, MessageCircle, User, Shield, Trophy, Menu, X, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const navItems = [
  { path: '/', label: 'Trang chủ', icon: Home },
  { path: '/dashboard', label: 'Dashboard', icon: Layers },
  { path: '/flashcards', label: 'Flashcards', icon: BookOpen },
  { path: '/lessons', label: 'Bài học', icon: BookOpen },
  { path: '/quiz', label: 'Quiz', icon: HelpCircle },
  { path: '/materials', label: 'Tài liệu', icon: FileText },
  { path: '/forum', label: 'Diễn đàn', icon: MessageSquare },
  { path: '/chat', label: 'Chat', icon: MessageCircle },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    const name = localStorage.getItem('username');
    const adminFlag = localStorage.getItem('isAdmin') === 'true';
    setUsername(name);
    setIsAdmin(adminFlag);

    const handler = () => {
      const updated = localStorage.getItem('username');
      const updatedAdmin = localStorage.getItem('isAdmin') === 'true';
      setUsername(updated);
      setIsAdmin(updatedAdmin);
    };

    window.addEventListener('username-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('username-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    setIsAdmin(false);
    window.dispatchEvent(new Event('username-changed'));
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 glass-card rounded-none border-x-0 border-t-0">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 font-jp font-bold text-xl">
          <span className="text-2xl">🌸</span>
          <span className="gradient-text">NihonGo!</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <item.icon size={16} />
                {item.label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={isDark ? 'Bật sáng' : 'Bật tối'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/leaderboard" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Trophy size={18} />
          </Link>
          <Link to="/profile" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <User size={18} />
          </Link>
          {isAdmin && (
            <Link to="/admin" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Shield size={18} />
            </Link>
          )}
          {username ? (
            <>
              <span className="px-3 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                {username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/60"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/register" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                Đăng ký
              </Link>
              <Link to="/login" className="gradient-bg text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Đăng nhập
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-foreground">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-1"
        >
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                location.pathname === item.path ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2 border-t border-border mt-2">
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              {isDark ? 'Sáng' : 'Tối'}
            </button>
            {username ? (
              <>
                <span className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-center bg-muted text-muted-foreground">
                  {username}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-center border border-border hover:bg-muted"
                >
                  Đăng ký
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 gradient-bg text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium text-center"
                >
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}
