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

const checkIsAdmin = async (username) => {
  if (!username) return false;
  try {
    const r = await pool
      .request()
      .input("Username", sql.NVarChar(255), username)
      .query("SELECT ISNULL(IsAdmin, 0) AS IsAdmin FROM Users WHERE Username = @Username");
    return !!r.recordset?.[0]?.IsAdmin;
  } catch {
    return false;
  }
};

// GET /api/chat/messages - list messages (limit 100, optional sinceId for polling)
router.get("/messages", async (req, res) => {
  const sinceId = req.query.sinceId ? parseInt(req.query.sinceId, 10) : null;

  try {
    await poolConnect;

    let query = `
      SELECT TOP 100 c.Id, c.Username, c.Message, c.CreatedAt, ISNULL(u.IsAdmin, 0) AS IsAdmin
      FROM ChatMessages c
      LEFT JOIN Users u ON u.Username = c.Username
    `;
    const request = pool.request();

    if (sinceId && !isNaN(sinceId)) {
      request.input("SinceId", sql.Int, sinceId);
      query += ` WHERE c.Id > @SinceId`;
    }
    query += ` ORDER BY c.Id ASC`;

    const result = await request.query(query);
    const rows = result.recordset || [];

    const formatDate = (d) => {
      if (!d) return null;
      const date = d instanceof Date ? d : new Date(d);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    };

    const messages = rows.map((row) => ({
      id: row.Id,
      username: decodeMaybe(row.Username),
      message: row.Message || "",
      createdAt: formatDate(row.CreatedAt),
      isAdmin: !!row.IsAdmin,
    }));

    return res.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return res.status(500).json({ message: "Không thể tải tin nhắn" });
  }
});

// POST /api/chat/messages - send message (requires auth)
router.post("/messages", async (req, res) => {
  const { message } = req.body;
  const username = decodeHeaderUser(req.header("x-user"));

  if (!username) {
    return res.status(401).json({ message: "Vui lòng đăng nhập để gửi tin nhắn" });
  }

  if (!message?.trim()) {
    return res.status(400).json({ message: "Nội dung tin nhắn không được để trống" });
  }

  if (message.length > 2000) {
    return res.status(400).json({ message: "Tin nhắn quá dài" });
  }

  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("Username", sql.NVarChar(255), username)
      .input("Message", sql.NVarChar(sql.MAX), message.trim())
      .query(`
        INSERT INTO ChatMessages (Username, Message, CreatedAt)
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Message, INSERTED.CreatedAt
        VALUES (@Username, @Message, GETUTCDATE())
      `);

    const row = result.recordset[0];
    let isAdmin = false;
    try {
      const u = await pool.request().input("Username", sql.NVarChar(50), username).query("SELECT ISNULL(IsAdmin, 0) AS IsAdmin FROM Users WHERE Username = @Username");
      isAdmin = !!u.recordset?.[0]?.IsAdmin;
    } catch {}
    const formatDate = (d) => {
      if (!d) return null;
      const date = d instanceof Date ? d : new Date(d);
      return isNaN(date.getTime()) ? null : date.toISOString();
    };
    return res.status(201).json({
      id: row.Id,
      username: decodeMaybe(row.Username),
      message: row.Message,
      createdAt: formatDate(row.CreatedAt),
      isAdmin,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ message: "Không thể gửi tin nhắn" });
  }
});

// DELETE /api/chat/messages - xóa tất cả tin nhắn (admin only)
router.delete("/messages", async (req, res) => {
  const username = decodeHeaderUser(req.header("x-user"));
  if (!username) {
    return res.status(401).json({ message: "Vui lòng đăng nhập" });
  }
  if (!(await checkIsAdmin(username))) {
    return res.status(403).json({ message: "Chỉ admin mới xóa được tin nhắn" });
  }
  try {
    await poolConnect;
    await pool.request().query("DELETE FROM ChatMessages");
    return res.json({ message: "Đã xóa tất cả tin nhắn" });
  } catch (error) {
    console.error("Error deleting chat messages:", error);
    return res.status(500).json({ message: "Không thể xóa tin nhắn" });
  }
});

export default router;
