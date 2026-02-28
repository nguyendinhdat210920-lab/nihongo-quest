import express from "express";
import { pool, poolConnect } from "../db.js";

const router = express.Router();

const getCount = async (table) => {
  try {
    const result = await pool.request().query(`SELECT COUNT(*) AS Cnt FROM ${table}`);
    return result.recordset?.[0]?.Cnt || 0;
  } catch {
    return 0;
  }
};

// GET /api/stats - public stats for landing page
router.get("/", async (_req, res) => {
  try {
    await poolConnect;

    const [totalUsers, totalLessons, totalMaterials, totalQuizzes, totalDecks, totalFlashcards, totalPosts] =
      await Promise.all([
        getCount("Users"),
        getCount("Lessons"),
        getCount("Materials"),
        getCount("Quizzes"),
        getCount("Decks"),
        getCount("Flashcards"),
        getCount("ForumPosts"),
      ]);

    return res.json({
      totalUsers,
      totalLessons,
      totalMaterials,
      totalQuizzes,
      totalDecks,
      totalFlashcards,
      totalPosts,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

export default router;
