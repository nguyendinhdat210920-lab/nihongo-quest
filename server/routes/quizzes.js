import express from "express";
import { sql, pool, poolConnect } from "../db.js";

const router = express.Router();

const decodeHeaderUser = (value) => {
  if (!value) return "anonymous";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const decodeMaybe = (value) => {
  if (value == null) return value;
  const s = String(value);
  if (!s.includes("%")) return s;
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

// GET /api/quizzes - list all quizzes (with optional progress for a user)
router.get("/", async (req, res) => {
  try {
    await poolConnect;

    const result = await pool
      .request()
      .query(
        "SELECT Id, Title, Description, CreatorName, QuestionCount, CreatedAt FROM Quizzes ORDER BY CreatedAt DESC",
      );

    const rows = result.recordset || [];
    const mapped = rows.map((row) => ({
      id: row.Id,
      title: row.Title,
      description: row.Description,
      creatorName: decodeMaybe(row.CreatorName),
      questionCount: row.QuestionCount,
      createdAt: row.CreatedAt,
    }));

    const progressUsername =
      (req.query.username && typeof req.query.username === "string" ? req.query.username : null) ||
      decodeHeaderUser(req.header("x-user"));
    if (progressUsername) {
      const progressResult = await pool
        .request()
        .input("Username", sql.NVarChar(255), progressUsername)
        .query(
          "SELECT QuizId, COUNT(*) AS Attempts, MAX(Score) AS BestScore, MAX(TotalQuestions) AS BestTotalQuestions, MAX(CreatedAt) AS LastTakenAt FROM QuizResults WHERE Username = @Username GROUP BY QuizId",
        );

      const progressByQuizId = new Map();
      for (const row of progressResult.recordset || []) {
        const bestScore = row.BestScore || 0;
        const bestTotal = row.BestTotalQuestions || 0;
        const bestPercent =
          bestTotal > 0 ? Math.round((bestScore * 100) / bestTotal) : 0;

        progressByQuizId.set(row.QuizId, {
          attempts: row.Attempts,
          bestScore,
          bestTotalQuestions: bestTotal,
          bestPercent,
          lastTakenAt: row.LastTakenAt,
        });
      }

      for (const quiz of mapped) {
        const p = progressByQuizId.get(quiz.id);
        if (p) {
          quiz.attempts = p.attempts;
          quiz.bestScore = p.bestScore;
          // Fallback: nếu total_questions trong DB = 0/NULL thì dùng question_count của quiz
          const total = p.bestTotalQuestions || quiz.questionCount || 0;
          quiz.bestTotalQuestions = total;
          quiz.bestPercent = total > 0 ? Math.round((p.bestScore * 100) / total) : 0;
          quiz.lastTakenAt = p.lastTakenAt;
        }
      }
    }

    return res.json(mapped);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return res.status(500).json({ message: "Failed to fetch quizzes" });
  }
});

// GET /api/quizzes/:id/share-link - lấy link chia sẻ (phải đặt trước GET /:id)
router.get("/:id/share-link", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;
    const check = await pool.request().input("Id", sql.Int, id).query("SELECT CreatorName FROM Quizzes WHERE Id = @Id");
    if (!check.recordset?.length) return res.status(404).json({ message: "Quiz not found" });
    const owner = decodeMaybe(check.recordset[0].CreatorName);
    if (owner !== requester) return res.status(403).json({ message: "Chỉ tác giả mới tạo link chia sẻ" });

    const crypto = await import("crypto");
    const token = crypto.randomBytes(24).toString("hex");
    const baseUrl = (process.env.SITE_URL || process.env.API_URL || process.env.BASE_URL || (req.protocol + "://" + (req.get("host") || "localhost:5173"))).replace(/\/$/, "").replace(/\/api$/, "");

    try {
      await pool.request()
        .input("QuizId", sql.Int, id)
        .input("Token", sql.NVarChar(64), token)
        .query("INSERT INTO QuizShareTokens (QuizId, Token) VALUES (@QuizId, @Token) ON CONFLICT (QuizId) DO UPDATE SET Token = @Token");
    } catch (e) {
      if (e?.message?.includes("quiz_share_tokens")) {
        return res.status(400).json({ message: "Chạy server/sql/share-links.sql" });
      }
      throw e;
    }

    const url = `${baseUrl}/quiz?share=${id}&token=${token}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ message: "Failed" });
  }
});

// GET /api/quizzes/:id - quiz detail with questions
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;

    const quizResult = await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .query(
        "SELECT Id, Title, Description, CreatorName, QuestionCount, CreatedAt FROM Quizzes WHERE Id = @Id",
      );

    if (!quizResult.recordset.length) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const token = req.query.token && typeof req.query.token === "string" ? req.query.token : null;
    const creator = decodeMaybe(quizResult.recordset[0].CreatorName);
    if (creator !== requester) {
      try {
        const hasToken = await pool.request().input("QuizId", sql.Int, id).query("SELECT 1 FROM QuizShareTokens WHERE QuizId = @QuizId LIMIT 1");
        if (hasToken.recordset?.length) {
          if (token) {
            const tok = await pool.request().input("QuizId", sql.Int, id).input("Token", sql.NVarChar(64), token)
              .query("SELECT 1 FROM QuizShareTokens WHERE QuizId = @QuizId AND Token = @Token");
            if (!tok.recordset?.length) return res.status(404).json({ message: "Quiz not found" });
          } else {
            return res.status(404).json({ message: "Quiz not found" });
          }
        }
      } catch {
        // table may not exist
      }
    }

    const q = quizResult.recordset[0];
    const quiz = {
      id: q.Id,
      title: q.Title,
      description: q.Description,
      creatorName: decodeMaybe(q.CreatorName),
      questionCount: q.QuestionCount,
      createdAt: q.CreatedAt,
    };

    const questionsResult = await pool
      .request()
      .input("QuizId", sql.Int, Number(id))
      .query(
        "SELECT Id, QuizId, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption FROM QuizQuestions WHERE QuizId = @QuizId ORDER BY Id ASC",
      );

    const questions = (questionsResult.recordset || []).map((row) => ({
      id: row.Id,
      quizId: row.QuizId,
      questionText: row.QuestionText,
      optionA: row.OptionA,
      optionB: row.OptionB,
      optionC: row.OptionC,
      optionD: row.OptionD,
      correctOption: row.CorrectOption,
    }));

    return res.json({ quiz, questions });
  } catch (error) {
    console.error("Error fetching quiz detail:", error);
    return res.status(500).json({ message: "Failed to fetch quiz" });
  }
});

// POST /api/quizzes - create new quiz with questions
router.post("/", async (req, res) => {
  const requester = decodeHeaderUser(req.header("x-user"));
  const { title, description, questions } = req.body;

  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({
      message: "Title and at least one question are required",
    });
  }

  try {
    await poolConnect;

    const quizInsert = await pool
      .request()
      .input("Title", sql.NVarChar(255), title)
      .input("Description", sql.NVarChar(500), description || null)
      .input("CreatorName", sql.NVarChar(255), requester)
      .input("QuestionCount", sql.Int, questions.length)
      .query(
        "INSERT INTO Quizzes (Title, Description, CreatorName, QuestionCount) OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Description, INSERTED.CreatorName, INSERTED.QuestionCount, INSERTED.CreatedAt VALUES (@Title, @Description, @CreatorName, @QuestionCount)",
      );

    const quizRow = quizInsert.recordset[0];
    const quizId = quizRow.Id;

    for (const q of questions) {
      if (
        !q ||
        !q.questionText ||
        !q.optionA ||
        !q.optionB ||
        !q.optionC ||
        !q.optionD ||
        !q.correctOption
      ) {
        // skip invalid question
        // eslint-disable-next-line no-continue
        continue;
      }

      await pool
        .request()
        .input("QuizId", sql.Int, quizId)
        .input("QuestionText", sql.NVarChar(sql.MAX), q.questionText)
        .input("OptionA", sql.NVarChar(255), q.optionA)
        .input("OptionB", sql.NVarChar(255), q.optionB)
        .input("OptionC", sql.NVarChar(255), q.optionC)
        .input("OptionD", sql.NVarChar(255), q.optionD)
        .input("CorrectOption", sql.NChar(1), q.correctOption)
        .query(
          "INSERT INTO QuizQuestions (QuizId, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES (@QuizId, @QuestionText, @OptionA, @OptionB, @OptionC, @OptionD, @CorrectOption)",
        );
    }

    const created = {
      id: quizRow.Id,
      title: quizRow.Title,
      description: quizRow.Description,
      creatorName: quizRow.CreatorName,
      questionCount: quizRow.QuestionCount,
      createdAt: quizRow.CreatedAt,
    };

    return res.status(201).json(created);
  } catch (error) {
    console.error("Error creating quiz:", error);
    return res.status(500).json({ message: "Failed to create quiz" });
  }
});

// PUT /api/quizzes/:id - update quiz (only creator)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));
  const { title, description, questions } = req.body;

  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({
      message: "Title and at least one question are required",
    });
  }

  try {
    await poolConnect;

    const existing = await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .query("SELECT Id, CreatorName FROM Quizzes WHERE Id = @Id");

    if (!existing.recordset.length) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const quizRow = existing.recordset[0];
    const owner = decodeMaybe(quizRow.CreatorName);
    if (owner && owner !== requester) {
      return res
        .status(403)
        .json({ message: "You are not allowed to edit this quiz" });
    }

    await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .input("Title", sql.NVarChar(255), title)
      .input("Description", sql.NVarChar(500), description || null)
      .input("QuestionCount", sql.Int, questions.length)
      .query(
        "UPDATE Quizzes SET Title = @Title, Description = @Description, QuestionCount = @QuestionCount WHERE Id = @Id",
      );

    // Replace questions: delete then re-insert
    await pool
      .request()
      .input("QuizId", sql.Int, Number(id))
      .query("DELETE FROM QuizQuestions WHERE QuizId = @QuizId");

    for (const q of questions) {
      if (
        !q ||
        !q.questionText ||
        !q.optionA ||
        !q.optionB ||
        !q.optionC ||
        !q.optionD ||
        !q.correctOption
      ) {
        // eslint-disable-next-line no-continue
        continue;
      }

      await pool
        .request()
        .input("QuizId", sql.Int, Number(id))
        .input("QuestionText", sql.NVarChar(sql.MAX), q.questionText)
        .input("OptionA", sql.NVarChar(255), q.optionA)
        .input("OptionB", sql.NVarChar(255), q.optionB)
        .input("OptionC", sql.NVarChar(255), q.optionC)
        .input("OptionD", sql.NVarChar(255), q.optionD)
        .input("CorrectOption", sql.NChar(1), q.correctOption)
        .query(
          "INSERT INTO QuizQuestions (QuizId, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES (@QuizId, @QuestionText, @OptionA, @OptionB, @OptionC, @OptionD, @CorrectOption)",
        );
    }

    return res.json({ message: "Updated" });
  } catch (error) {
    console.error("Error updating quiz:", error);
    return res.status(500).json({ message: "Failed to update quiz" });
  }
});

// DELETE /api/quizzes/:id - delete quiz (only creator)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;

    const existing = await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .query("SELECT Id, CreatorName FROM Quizzes WHERE Id = @Id");

    if (!existing.recordset.length) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const quiz = existing.recordset[0];
    const owner = decodeMaybe(quiz.CreatorName);
    if (owner && owner !== requester) {
      return res
        .status(403)
        .json({ message: "You are not allowed to delete this quiz" });
    }

    await pool
      .request()
      .input("QuizId", sql.Int, Number(id))
      .query("DELETE FROM QuizResults WHERE QuizId = @QuizId");

    await pool
      .request()
      .input("QuizId", sql.Int, Number(id))
      .query("DELETE FROM QuizQuestions WHERE QuizId = @QuizId");

    await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .query("DELETE FROM Quizzes WHERE Id = @Id");

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return res.status(500).json({ message: "Failed to delete quiz" });
  }
});

// POST /api/quizzes/:id/results - save quiz result
router.post("/:id/results", async (req, res) => {
  const { id } = req.params;
  const { username, score, totalQuestions } = req.body;

  if (
    !username ||
    typeof score !== "number" ||
    typeof totalQuestions !== "number"
  ) {
    return res.status(400).json({
      message: "username, score and totalQuestions are required",
    });
  }

  try {
    await poolConnect;

    const insertResult = await pool
      .request()
      .input("QuizId", sql.Int, Number(id))
      .input("Username", sql.NVarChar(255), username)
      .input("Score", sql.Int, score)
      .input("TotalQuestions", sql.Int, totalQuestions)
      .query(
        "INSERT INTO QuizResults (QuizId, Username, Score, TotalQuestions) OUTPUT INSERTED.Id, INSERTED.QuizId, INSERTED.Username, INSERTED.Score, INSERTED.TotalQuestions, INSERTED.CreatedAt VALUES (@QuizId, @Username, @Score, @TotalQuestions)",
      );

    const row = insertResult.recordset[0];
    const created = {
      id: row.Id,
      quizId: row.QuizId,
      username: row.Username,
      score: row.Score,
      totalQuestions: row.TotalQuestions,
      createdAt: row.CreatedAt,
    };

    return res.status(201).json(created);
  } catch (error) {
    console.error("Error saving quiz result:", error);
    return res.status(500).json({ message: "Failed to save result" });
  }
});

export default router;

