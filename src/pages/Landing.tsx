import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, HelpCircle, FileText, MessageSquare, Trophy, Users, Sparkles, ArrowRight } from 'lucide-react';
import axios from 'axios';
import Footer from '@/components/Footer';
import { apiUrl } from '@/lib/api';

const features = [
  { icon: BookOpen, title: 'Flashcards', desc: 'Tạo, học và chia sẻ bộ thẻ từ vựng với hiệu ứng flip mượt mà', color: 'text-primary' },
  { icon: HelpCircle, title: 'Quiz', desc: 'Trắc nghiệm 4 đáp án, chấm điểm tự động, bảng xếp hạng', color: 'text-secondary' },
  { icon: FileText, title: 'Tài liệu', desc: 'Upload, tìm kiếm và download tài liệu học phân loại theo JLPT', color: 'text-accent' },
  { icon: MessageSquare, title: 'Diễn đàn', desc: 'Đăng bài, bình luận, trao đổi kinh nghiệm với cộng đồng', color: 'text-primary' },
  { icon: Trophy, title: 'Gamification', desc: 'Streak hàng ngày, danh hiệu, leaderboard thúc đẩy động lực', color: 'text-secondary' },
  { icon: Users, title: 'Chat Realtime', desc: 'Phòng chat chung, giao lưu và luyện tiếng Nhật trực tiếp', color: 'text-accent' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

interface Stats {
  totalUsers?: number;
  totalDecks?: number;
  totalFlashcards?: number;
  totalQuizzes?: number;
}

export default function Landing() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    axios.get<Stats>(apiUrl("/api/stats")).then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const formatNum = (n: number | undefined) =>
    n != null ? (n >= 1000 ? `${(n / 1000).toFixed(1)}k+` : `${n}+`) : "—";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative container mx-auto px-4 py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles size={14} />
              Nền tảng học tiếng Nhật #1 Việt Nam
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-jp mb-6 leading-tight">
              Chinh phục{' '}
              <span className="gradient-text">tiếng Nhật</span>
              <br />
              mỗi ngày cùng{' '}
              <span className="gradient-text">NihonGo!</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
              Flashcard thông minh, quiz thử thách, cộng đồng sôi động — tất cả trong một nền tảng hiện đại.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/register"
                className="gradient-bg text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 sakura-glow"
              >
                Bắt đầu học ngay
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/flashcards"
                className="bg-card border border-border px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-muted transition-colors"
              >
                Khám phá Flashcards
              </Link>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div><span className="text-2xl font-bold text-foreground">{formatNum(stats?.totalUsers)}</span><br />Người học</div>
              <div className="w-px h-10 bg-border" />
              <div><span className="text-2xl font-bold text-foreground">{formatNum(stats?.totalFlashcards ?? stats?.totalDecks)}</span><br />Flashcards</div>
              <div className="w-px h-10 bg-border" />
              <div><span className="text-2xl font-bold text-foreground">{formatNum(stats?.totalQuizzes)}</span><br />Quiz</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold font-jp mb-4">Tính năng <span className="gradient-text">nổi bật</span></h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Mọi thứ bạn cần để chinh phục tiếng Nhật, từ N5 đến N1</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="glass-card p-6 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <f.icon size={32} className={f.color + ' mb-4'} />
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card p-12 max-w-2xl mx-auto"
        >
          <h2 className="text-3xl font-bold font-jp mb-4">Sẵn sàng chinh phục <span className="gradient-text">tiếng Nhật?</span></h2>
          <p className="text-muted-foreground mb-6">Tham gia cùng hàng ngàn người học. Hoàn toàn miễn phí!</p>
          <Link to="/register" className="inline-flex items-center gap-2 gradient-bg text-primary-foreground px-8 py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity">
            Đăng ký miễn phí <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
