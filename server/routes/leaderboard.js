import express from "express";
import { pool, poolConnect } from "../db.js";

const router = express.Router();

// GET /api/leaderboard - top users by quiz score (last 30 days)
router.get("/", async (_req, res) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT 
        Username AS username,
        SUM(Score) AS totalScore,
        COUNT(*) AS attempts,
        MAX(CreatedAt) AS lastActivity
      FROM QuizResults
      WHERE Username IS NOT NULL AND Username != ''
      GROUP BY Username
      ORDER BY SUM(Score) DESC
      OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `);

    const rows = result.recordset || [];
    const leaderboard = rows.map((r, i) => ({
      rank: i + 1,
      username: r.Username ?? r.username ?? "",
      score: r.Totalscore ?? r.totalScore ?? 0,
      attempts: r.Attempts ?? r.attempts ?? 0,
    }));

    return res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return res.status(500).json({ message: "Không thể tải bảng xếp hạng" });
  }
});

export default router;
