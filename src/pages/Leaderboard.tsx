import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import { currentUser } from "@/lib/mockData";

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  attempts: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const username =
    (typeof window !== "undefined" && localStorage.getItem("username")) ||
    currentUser.username;

  useEffect(() => {
    axios
      .get<LeaderboardEntry[]>(apiUrl("/api/leaderboard"))
      .then((r) => setEntries(r.data))
      .catch(() => setError("Không thể tải bảng xếp hạng."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-jp flex items-center gap-2 mb-2">
          <Trophy className="text-secondary" /> Bảng xếp hạng
        </h1>
        <p className="text-muted-foreground mb-8">
          Top theo tổng điểm
        </p>

        {error && (
          <p className="text-sm text-destructive mb-4 flex items-center gap-1">
            <AlertCircle size={16} /> {error}
          </p>
        )}

        {loading ? (
          <div className="max-w-2xl mx-auto space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="glass-card p-5 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Trophy size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có dữ liệu. Hãy làm Quiz để lên bảng!</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {entries.map((l, i) => (
              <motion.div
                key={l.username + l.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card p-5 flex items-center gap-4 ${l.rank <= 3 ? "border-primary/30" : ""} ${l.username === username ? "bg-primary/10" : ""}`}
              >
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${l.rank === 1 ? "gradient-bg text-primary-foreground text-lg" : l.rank <= 3 ? "gradient-accent-bg text-accent-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {l.rank === 1 ? "🥇" : l.rank === 2 ? "🥈" : l.rank === 3 ? "🥉" : l.rank}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{l.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {l.score.toLocaleString()} điểm
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {l.attempts} lần làm
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
