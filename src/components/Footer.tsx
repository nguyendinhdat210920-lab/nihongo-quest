import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-jp font-bold text-xl mb-3">
              <span className="text-2xl">🌸</span>
              <span className="gradient-text">NihonGo!</span>
            </div>
            <p className="text-sm text-muted-foreground">Nền tảng học tiếng Nhật hiện đại, miễn phí và thú vị cho mọi người.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Học tập</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/flashcards" className="block hover:text-foreground transition-colors">Flashcards</Link>
              <Link to="/quiz" className="block hover:text-foreground transition-colors">Quiz</Link>
              <Link to="/materials" className="block hover:text-foreground transition-colors">Tài liệu</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Cộng đồng</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/forum" className="block hover:text-foreground transition-colors">Diễn đàn</Link>
              <Link to="/chat" className="block hover:text-foreground transition-colors">Chat</Link>
              <Link to="/leaderboard" className="block hover:text-foreground transition-colors">Bảng xếp hạng</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Liên kết</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a href="#" className="block hover:text-foreground transition-colors">Về chúng tôi</a>
              <a href="#" className="block hover:text-foreground transition-colors">Điều khoản</a>
              <a href="#" className="block hover:text-foreground transition-colors">Chính sách bảo mật</a>
            </div>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          © 2024 NihonGo! — Học tiếng Nhật mỗi ngày 🌸
        </div>
      </div>
    </footer>
  );
}
