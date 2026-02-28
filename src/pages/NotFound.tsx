import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => (
  <div className="min-h-[60vh] flex items-center justify-center px-4">
    <div className="glass-card p-12 max-w-md text-center">
      <p className="text-8xl font-bold gradient-text mb-4">404</p>
      <h1 className="text-2xl font-bold font-jp mb-2">Không tìm thấy trang</h1>
      <p className="text-muted-foreground mb-8">
        Trang bạn đang tìm có thể đã bị xóa hoặc đổi địa chỉ.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 gradient-bg text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Home size={18} /> Về trang chủ
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border font-medium hover:bg-muted transition-colors"
        >
          <ArrowLeft size={18} /> Quay lại
        </button>
      </div>
    </div>
  </div>
);

export default NotFound;
