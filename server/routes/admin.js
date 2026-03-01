import express from "express";
import { sql, pool, poolConnect } from "../db.js";

const router = express.Router();

const decodeHeaderUser = (value) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const checkIsAdmin = async (username) => {
  if (!username) return false;
  if (username === "Đình Đạt") return true;
  try {
    await poolConnect;
    const r = await pool
      .request()
      .input("Username", sql.NVarChar(50), username)
      .query("SELECT ISNULL(IsAdmin, 0) AS IsAdmin FROM Users WHERE Username = @Username");
    return !!r.recordset?.[0]?.IsAdmin;
  } catch (e) {
    return false;
  }
};

const requireAdmin = (req, res, next) => {
  (async () => {
    try {
      const requester = decodeHeaderUser(req.header("x-user") || "");
      if (!requester || !(await checkIsAdmin(requester))) {
        return res.status(403).json({ message: "Admin only" });
      }
      next();
    } catch (err) {
      next(err);
    }
  })();
};

let cachedHasLessonStatus = null;
let cachedHasLessonStatusAt = 0;
const hasLessonsStatusColumn = async () => {
  if (process.env.DATABASE_URL) return true;
  const now = Date.now();
  if (cachedHasLessonStatus != null && now - cachedHasLessonStatusAt < 60_000)
    return cachedHasLessonStatus;
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query("SELECT COL_LENGTH('dbo.Lessons','Status') AS ColLen");
    const len = result.recordset?.[0]?.ColLen;
    cachedHasLessonStatus = len != null;
    cachedHasLessonStatusAt = now;
    return cachedHasLessonStatus;
  } catch (err) {
    console.warn("Failed to detect Lessons.Status column (admin):", err);
    cachedHasLessonStatus = false;
    cachedHasLessonStatusAt = now;
    return false;
  }
};

// GET /api/admin/users - list all users
router.get("/users", requireAdmin, async (_req, res) => {
  try {
    await poolConnect;

    let result;
    try {
      result = await pool
        .request()
        .query(
          "SELECT Id, Username, Email, IsBanned, IsAdmin, CreatedAt FROM Users ORDER BY CreatedAt DESC",
        );
    } catch (e) {
      if (e?.message?.includes("IsAdmin") || e?.message?.includes("Invalid column")) {
        result = await pool
          .request()
          .query(
            "SELECT Id, Username, Email, IsBanned, CreatedAt FROM Users ORDER BY CreatedAt DESC",
          );
      } else {
        throw e;
      }
    }

    const rows = result.recordset || [];
    const users = rows.map((row) => ({
      id: row.Id,
      username: row.Username,
      email: row.Email,
      isBanned: !!row.IsBanned,
      isAdmin: row.IsAdmin !== undefined ? !!row.IsAdmin : row.Username === "Đình Đạt",
      createdAt: row.CreatedAt,
    }));

    return res.json(users);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

// GET /api/admin/lessons?status=pending - list lessons by status (for moderation)
router.get("/lessons", requireAdmin, async (req, res) => {
  const status =
    typeof req.query.status === "string" && req.query.status.length
      ? req.query.status
      : "pending";

  try {
    await poolConnect;

    const hasStatus = await hasLessonsStatusColumn();
    if (!hasStatus) {
      return res.json([]);
    }

    const result = await pool
      .request()
      .input("Status", sql.NVarChar(20), status)
      .query(
        "SELECT Id, Title, Content, CreatedBy, Status, CreatedAt FROM Lessons WHERE Status = @Status ORDER BY CreatedAt DESC",
      );

    const rows = result.recordset || [];
    const lessons = rows.map((row) => ({
      id: row.Id,
      title: row.Title,
      content: row.Content,
      createdBy: row.CreatedBy,
      status: row.Status,
      createdAt: row.CreatedAt,
    }));

    return res.json(lessons);
  } catch (error) {
    console.error("Error fetching admin lessons:", error);
    return res.json([]);
  }
});

// GET /api/admin/stats - basic app statistics
router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    await poolConnect;

    const getCount = async (table) => {
      try {
        const result = await pool
          .request()
          .query(`SELECT COUNT(*) AS Cnt FROM ${table}`);
        return result.recordset?.[0]?.Cnt || 0;
      } catch (err) {
        console.warn(`Failed to count table ${table}:`, err);
        return 0;
      }
    };

    const totalUsers = await getCount("Users");
    const totalLessons = await getCount("Lessons");
    const totalMaterials = await getCount("Materials");
    const totalQuizzes = await getCount("Quizzes");
    const totalQuizResults = await getCount("QuizResults");

    let demoLessonsCount = 0;
    let demoQuizzesCount = 0;
    try {
      const demoRes = await pool
        .request()
        .query("SELECT COUNT(*) AS Cnt FROM Lessons WHERE CreatedBy = N'@system' OR CreatedBy = N'system'");
      demoLessonsCount = demoRes.recordset?.[0]?.Cnt || 0;
    } catch {}
    try {
      const quizRes = await pool
        .request()
        .query("SELECT COUNT(*) AS Cnt FROM Quizzes WHERE CreatorName IN (N'@system', N'system', N'sakura_learner', N'nihongo_pro', N'sensei_tanaka')");
      demoQuizzesCount = quizRes.recordset?.[0]?.Cnt || 0;
    } catch {}

    return res.json({
      totalUsers,
      totalLessons,
      totalMaterials,
      totalQuizzes,
      totalQuizResults,
      demoLessonsCount,
      demoQuizzesCount,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// PATCH /api/admin/users/:id/ban - ban user
router.patch("/users/:id/ban", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .input("IsBanned", sql.Bit, true)
      .query("UPDATE Users SET IsBanned = @IsBanned WHERE Id = @Id");

    return res.json({ message: "User banned" });
  } catch (error) {
    console.error("Error banning user:", error);
    return res.status(500).json({ message: "Failed to ban user" });
  }
});

// PATCH /api/admin/users/:id/unban - unban user
router.patch("/users/:id/unban", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .input("IsBanned", sql.Bit, false)
      .query("UPDATE Users SET IsBanned = @IsBanned WHERE Id = @Id");

    return res.json({ message: "User unbanned" });
  } catch (error) {
    console.error("Error unbanning user:", error);
    return res.status(500).json({ message: "Failed to unban user" });
  }
});

// PATCH /api/admin/users/:id/admin - set IsAdmin
router.patch("/users/:id/admin", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { isAdmin } = req.body;

  try {
    await poolConnect;

    try {
      await pool
        .request()
        .input("Id", sql.Int, Number(id))
        .input("IsAdmin", sql.Bit, !!isAdmin)
        .query("UPDATE Users SET IsAdmin = @IsAdmin WHERE Id = @Id");
    } catch (e) {
      if (e?.message?.includes("IsAdmin") || e?.message?.includes("Invalid column")) {
        return res.status(400).json({
          message: "Chưa có cột IsAdmin. Chạy file server/sql/users-add-isadmin.sql",
        });
      }
      throw e;
    }

    return res.json({ message: isAdmin ? "Đã cấp quyền admin" : "Đã thu hồi quyền admin" });
  } catch (error) {
    console.error("Error updating admin status:", error);
    return res.status(500).json({ message: "Không thể cập nhật" });
  }
});

// DELETE /api/admin/quizzes/demo - xóa quiz demo (system + tài khoản mẫu)
router.delete("/quizzes/demo", requireAdmin, async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query(`
      DELETE FROM Quizzes WHERE CreatorName IN (N'@system', N'system', N'sakura_learner', N'nihongo_pro', N'sensei_tanaka')
    `);
    const deleted = result.rowsAffected?.[0] ?? 0;
    return res.json({ message: `Đã xóa ${deleted} quiz demo`, deleted });
  } catch (error) {
    console.error("Error deleting demo quizzes:", error);
    return res.status(500).json({ message: "Không thể xóa quiz demo" });
  }
});

// DELETE /api/admin/lessons/demo - xóa tất cả bài học demo (@system)
router.delete("/lessons/demo", requireAdmin, async (req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query("DELETE FROM Lessons WHERE CreatedBy = N'@system' OR CreatedBy = N'system'");
    const deleted = result.rowsAffected?.[0] ?? 0;
    return res.json({ message: `Đã xóa ${deleted} bài học demo`, deleted });
  } catch (error) {
    console.error("Error deleting demo lessons:", error);
    return res.status(500).json({ message: "Không thể xóa bài học demo" });
  }
});

// PATCH /api/admin/lessons/:id/approve - approve lesson
router.patch("/lessons/:id/approve", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    const hasStatus = await hasLessonsStatusColumn();
    if (!hasStatus) {
      return res
        .status(400)
        .json({ message: "Lessons table does not have Status column" });
    }

    await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .input("Status", sql.NVarChar(20), "approved")
      .query("UPDATE Lessons SET Status = @Status WHERE Id = @Id");

    return res.json({ message: "Lesson approved" });
  } catch (error) {
    console.error("Error approving lesson:", error);
    return res.status(500).json({ message: "Failed to approve lesson" });
  }
});

// PATCH /api/admin/lessons/:id/reject - reject lesson
router.patch("/lessons/:id/reject", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    const hasStatus = await hasLessonsStatusColumn();
    if (!hasStatus) {
      return res
        .status(400)
        .json({ message: "Lessons table does not have Status column" });
    }

    await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .input("Status", sql.NVarChar(20), "rejected")
      .query("UPDATE Lessons SET Status = @Status WHERE Id = @Id");

    return res.json({ message: "Lesson rejected" });
  } catch (error) {
    console.error("Error rejecting lesson:", error);
    return res.status(500).json({ message: "Failed to reject lesson" });
  }
});

export default router;

