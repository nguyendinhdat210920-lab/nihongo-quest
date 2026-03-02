import express from "express";
import { sql, pool, poolConnect, usePostgres } from "../db.js";

const TZ = "Asia/Ho_Chi_Minh";

const router = express.Router();

const decodeHeaderUser = (value) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// GET /api/dashboard/stats - user stats (x-user header)
router.get("/stats", async (req, res) => {
  const username = decodeHeaderUser(req.header("x-user"));
  if (!username) {
    return res.status(401).json({ message: "Vui lòng đăng nhập" });
  }

  try {
    await poolConnect;

    const quizResult = await pool
      .request()
      .input("Username", sql.NVarChar(255), username)
      .query(`
        SELECT 
          COUNT(*) AS totalQuizzes,
          ISNULL(SUM(Score), 0) AS totalPoints,
          AVG(CASE WHEN TotalQuestions > 0 THEN Score * 100.0 / TotalQuestions ELSE 0 END) AS avgScore
        FROM QuizResults
        WHERE Username = @Username
      `);

    const quizRow = quizResult.recordset?.[0] || {};
    const totalQuizzes = quizRow.Totalquizzes ?? quizRow.totalQuizzes ?? 0;
    const totalPoints = quizRow.Totalpoints ?? quizRow.totalPoints ?? 0;
    const avgScore = Math.round(quizRow.Avgscore ?? quizRow.avgScore ?? 0);

    let totalWords = 0;
    try {
      const wordsResult = await pool
        .request()
        .input("Username", sql.NVarChar(255), username)
        .query(`
          SELECT COUNT(*) AS totalWords
          FROM Flashcards f
          INNER JOIN Decks d ON f.DeckId = d.Id
          WHERE d.OwnerUsername = @Username AND f.Learned = true
        `);
      totalWords = wordsResult.recordset?.[0]?.Totalwords ?? wordsResult.recordset?.[0]?.totalWords ?? 0;
    } catch {
      totalWords = 0;
    }

    let dates = [];
    let today = new Date().toISOString().slice(0, 10);

    if (usePostgres) {
      const streakRes = await pool.query(
        `SELECT (created_at AT TIME ZONE $1)::date AS activity_date FROM quiz_results WHERE username = $2 GROUP BY (created_at AT TIME ZONE $1)::date ORDER BY activity_date DESC`,
        [TZ, username]
      );
      dates = (streakRes.rows || []).map((r) => {
        const d = r.activity_date;
        return d instanceof Date ? d.toISOString().slice(0, 10) : String(d || "").slice(0, 10);
      });
      today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    } else {
      const streakResult = await pool
        .request()
        .input("Username", sql.NVarChar(255), username)
        .query(`
        SELECT CAST(CreatedAt AS DATE) AS ActivityDate
        FROM QuizResults
        WHERE Username = @Username
        GROUP BY CAST(CreatedAt AS DATE)
        ORDER BY ActivityDate DESC
      `);
      dates = (streakResult.recordset || []).map((r) => {
        const d = r.Activitydate ?? r.ActivityDate;
        return d instanceof Date ? d.toISOString().slice(0, 10) : String(d || "").slice(0, 10);
      });
    }

    let streak = 0;
    if (dates.includes(today)) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) streak++;
        else break;
      }
    }

    let forumPosts = 0;
    let forumComments = 0;
    let lessonsCreated = 0;
    let perfectScores = 0;
    try {
      const fp = await pool.request().input("Username", sql.NVarChar(255), username).query("SELECT COUNT(*) AS Cnt FROM ForumPosts WHERE AuthorUsername = @Username");
      forumPosts = fp.recordset?.[0]?.Cnt ?? 0;
    } catch {}
    try {
      const fc = await pool.request().input("Username", sql.NVarChar(255), username).query("SELECT COUNT(*) AS Cnt FROM ForumComments WHERE AuthorUsername = @Username");
      forumComments = fc.recordset?.[0]?.Cnt ?? 0;
    } catch {}
    try {
      const lc = await pool.request().input("Username", sql.NVarChar(255), username).query("SELECT COUNT(*) AS Cnt FROM Lessons WHERE CreatedBy = @Username");
      lessonsCreated = lc.recordset?.[0]?.Cnt ?? 0;
    } catch {}
    try {
      const ps = await pool.request().input("Username", sql.NVarChar(255), username).query(`
        SELECT COUNT(*) AS Cnt FROM QuizResults WHERE Username = @Username AND TotalQuestions > 0 AND Score = TotalQuestions
      `);
      perfectScores = ps.recordset?.[0]?.Cnt ?? 0;
    } catch {}

    const badges = [];
    if (streak >= 3) badges.push({ id: "streak3", name: "🔥 3 ngày liên tiếp", criteria: "Làm quiz 3 ngày liên tiếp" });
    if (streak >= 7) badges.push({ id: "streak7", name: "🔥 7 ngày liên tiếp", criteria: "Làm quiz 7 ngày liên tiếp" });
    if (streak >= 30) badges.push({ id: "streak30", name: "🔥 30 ngày liên tiếp", criteria: "Làm quiz 30 ngày liên tiếp" });
    if (streak >= 100) badges.push({ id: "streak100", name: "🔥 100 ngày liên tiếp", criteria: "Làm quiz 100 ngày liên tiếp" });
    if (totalWords >= 10) badges.push({ id: "words10", name: "📚 10 từ thuộc", criteria: "Thuộc 10 thẻ flashcard" });
    if (totalWords >= 50) badges.push({ id: "words50", name: "📚 50 từ thuộc", criteria: "Thuộc 50 thẻ flashcard" });
    if (totalWords >= 100) badges.push({ id: "words100", name: "📚 100 từ thuộc", criteria: "Thuộc 100 thẻ flashcard" });
    if (totalWords >= 500) badges.push({ id: "words500", name: "📚 500 từ thuộc", criteria: "Thuộc 500 thẻ flashcard" });
    if (totalWords >= 1000) badges.push({ id: "words1000", name: "📚 1000 từ thuộc", criteria: "Thuộc 1000 thẻ flashcard" });
    if (totalPoints >= 50) badges.push({ id: "points50", name: "🎯 50 điểm", criteria: "Tích lũy 50 điểm (1 câu đúng = 1 điểm)" });
    if (totalPoints >= 100) badges.push({ id: "points100", name: "🎯 100 điểm", criteria: "Tích lũy 100 điểm" });
    if (totalPoints >= 250) badges.push({ id: "points250", name: "🎯 250 điểm", criteria: "Tích lũy 250 điểm" });
    if (totalPoints >= 500) badges.push({ id: "points500", name: "🎯 Quiz Master", criteria: "Tích lũy 500 điểm" });
    if (totalPoints >= 1000) badges.push({ id: "points1000", name: "🎯 Chuyên gia Quiz", criteria: "Tích lũy 1000 điểm" });
    if (totalPoints >= 2500) badges.push({ id: "points2500", name: "🎯 Cao thủ", criteria: "Tích lũy 2500 điểm" });
    if (totalPoints >= 5000) badges.push({ id: "points5000", name: "🎯 Huyền thoại", criteria: "Tích lũy 5000 điểm" });
    if (avgScore >= 70 && totalQuizzes >= 1) badges.push({ id: "score70", name: "⭐ Điểm khá", criteria: "Điểm TB ≥ 70%" });
    if (avgScore >= 80 && totalQuizzes >= 1) badges.push({ id: "score80", name: "⭐ High Scorer", criteria: "Điểm TB ≥ 80%" });
    if (avgScore >= 90 && totalQuizzes >= 1) badges.push({ id: "score90", name: "⭐ Xuất sắc", criteria: "Điểm TB ≥ 90%" });
    if (perfectScores >= 1) badges.push({ id: "perfect1", name: "💯 Điểm tuyệt đối", criteria: "Đạt 100% trong 1 bài quiz" });
    if (perfectScores >= 5) badges.push({ id: "perfect5", name: "💯 5 lần hoàn hảo", criteria: "Đạt 100% trong 5 bài quiz" });
    if (forumPosts >= 1) badges.push({ id: "forum1", name: "💬 Người chia sẻ", criteria: "Đăng 1 bài lên diễn đàn" });
    if (forumPosts >= 5) badges.push({ id: "forum5", name: "💬 Cộng tác viên", criteria: "Đăng 5 bài lên diễn đàn" });
    if (forumPosts >= 10) badges.push({ id: "forum10", name: "💬 Chuyên gia diễn đàn", criteria: "Đăng 10 bài lên diễn đàn" });
    if (forumComments >= 5) badges.push({ id: "comment5", name: "💭 5 bình luận", criteria: "Viết 5 bình luận" });
    if (forumComments >= 20) badges.push({ id: "comment20", name: "💭 Thành viên tích cực", criteria: "Viết 20 bình luận" });
    if (lessonsCreated >= 1) badges.push({ id: "lesson1", name: "📖 Tác giả bài học", criteria: "Tạo 1 bài học" });
    if (lessonsCreated >= 5) badges.push({ id: "lesson5", name: "📖 Giáo viên", criteria: "Tạo 5 bài học" });

    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const weeklyProgress = dayNames.map((day) => ({ day, words: 0, quizzes: 0 }));
    try {
      const weekResult = await pool
        .request()
        .input("Username", sql.NVarChar(255), username)
        .query(`
          SELECT DATEPART(WEEKDAY, CreatedAt) AS Dow, COUNT(*) AS Cnt
          FROM QuizResults
          WHERE Username = @Username AND CreatedAt >= DATEADD(day, -7, GETDATE())
          GROUP BY DATEPART(WEEKDAY, CreatedAt)
        `);
      (weekResult.recordset || []).forEach((r) => {
        const dow = r.Dow ?? r.dow ?? 1;
        const idx = Math.min(Math.max(dow - 1, 0), 6);
        weeklyProgress[idx].quizzes = r.Cnt ?? r.cnt ?? 0;
      });
    } catch {}

    let monthlyScores = [];
    try {
      const monthResult = await pool
        .request()
        .input("Username", sql.NVarChar(255), username)
        .query(`
          SELECT MONTH(CreatedAt) AS M, YEAR(CreatedAt) AS Y, AVG(CASE WHEN TotalQuestions > 0 THEN Score * 100.0 / TotalQuestions ELSE 0 END) AS AvgScore
          FROM QuizResults
          WHERE Username = @Username AND CreatedAt >= DATEADD(month, -6, GETDATE())
          GROUP BY MONTH(CreatedAt), YEAR(CreatedAt)
          ORDER BY YEAR(CreatedAt), MONTH(CreatedAt)
        `);
      monthlyScores = (monthResult.recordset || []).map((r) => ({
        month: `T${r.M ?? r.m ?? 1}/${String(r.Y ?? r.y ?? new Date().getFullYear()).slice(-2)}`,
        score: Math.round(r.Avgscore ?? r.AvgScore ?? 0),
      }));
    } catch {}

    return res.json({
      totalWords,
      totalQuizzes,
      totalPoints,
      avgScore,
      streak,
      badges,
      weeklyProgress,
      monthlyScores: monthlyScores.length ? monthlyScores : [{ month: "T1", score: 0 }],
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ message: "Không thể tải thống kê" });
  }
});

export default router;
