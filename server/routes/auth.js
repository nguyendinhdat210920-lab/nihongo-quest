import express from "express";
import crypto from "crypto";
import { sql, pool, poolConnect } from "../db.js";

const router = express.Router();

const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username và mật khẩu là bắt buộc" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
  }

  try {
    await poolConnect;

    const existing = await pool
      .request()
      .input("Username", sql.NVarChar(50), username)
      .query("SELECT Id FROM Users WHERE Username = @Username");

    if (existing.recordset.length) {
      return res
        .status(409)
        .json({ message: "Username đã tồn tại, hãy chọn tên khác" });
    }

    const hash = hashPassword(password);

    const insert = await pool
      .request()
      .input("Username", sql.NVarChar(50), username)
      .input("Email", sql.NVarChar(255), email || null)
      .input("PasswordHash", sql.NVarChar(255), hash)
      // IsBanned mặc định 0, IsAdmin không dùng đến ở đây
      .query(
        "INSERT INTO Users (Username, Email, PasswordHash, IsBanned) OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Email, INSERTED.IsBanned, INSERTED.CreatedAt VALUES (@Username, @Email, @PasswordHash, 0)",
      );

    const row = insert.recordset[0];
    return res.status(201).json({
      id: row.Id,
      username: row.Username,
      email: row.Email,
      isBanned: !!row.IsBanned,
      createdAt: row.CreatedAt,
    });
  } catch (error) {
    console.error("Error during register:", error?.message, error);
    const isDb = /connection|ECONNREFUSED|ENOTFOUND|timeout|connect/i.test(error?.message || "");
    return res.status(500).json({
      message: "Đăng ký thất bại. Hãy thử lại.",
      ...(isDb && { hint: "Lỗi kết nối DB. Kiểm tra DATABASE_URL trên Render." }),
    });
  }
});

// POST /api/auth/login - chấp nhận username HOẶC email
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const loginInput = (username || "").trim();

  if (!loginInput || !password) {
    return res
      .status(400)
      .json({ message: "Tên đăng nhập/email và mật khẩu là bắt buộc" });
  }

  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("Login", sql.NVarChar(255), loginInput)
      .query(
        `SELECT Id, Username, Email, PasswordHash, IsBanned, ISNULL(IsAdmin, 0) AS IsAdmin, CreatedAt 
         FROM Users 
         WHERE Username = @Login 
            OR (Email IS NOT NULL AND LOWER(LTRIM(RTRIM(Email))) = LOWER(LTRIM(RTRIM(@Login))))`,
      );

    if (!result.recordset.length) {
      return res
        .status(401)
        .json({ message: "Sai tên đăng nhập/email hoặc mật khẩu" });
    }

    const user = result.recordset[0];

    if (user.IsBanned) {
      return res.status(403).json({
        message: "Tài khoản của bạn đã bị khóa bởi admin.",
      });
    }

    const hash = hashPassword(password);
    if (hash !== user.PasswordHash) {
      return res
        .status(401)
        .json({ message: "Sai tên đăng nhập/email hoặc mật khẩu" });
    }

    const isAdmin = !!user.IsAdmin;

    return res.json({
      id: user.Id,
      username: user.Username,
      email: user.Email,
      isAdmin,
      isBanned: false,
      createdAt: user.CreatedAt,
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({
      message: "Đăng nhập thất bại. Kiểm tra lại tài khoản/mật khẩu.",
    });
  }
});

// POST /api/auth/admin-reset - reset mật khẩu qua API (cần ADMIN_RESET_SECRET)
router.post("/admin-reset", async (req, res) => {
  const { username, newPassword, secret } = req.body;
  const expected = process.env.ADMIN_RESET_SECRET;
  if (!expected || secret !== expected) {
    return res.status(403).json({ message: "Không có quyền" });
  }
  if (!username || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Cần username và mật khẩu mới (≥6 ký tự)" });
  }
  try {
    await poolConnect;
    const hash = hashPassword(newPassword);
    await pool
      .request()
      .input("Username", sql.NVarChar(50), username.trim())
      .input("PasswordHash", sql.NVarChar(255), hash)
      .query(
        "UPDATE Users SET PasswordHash = @PasswordHash, IsAdmin = true WHERE Username = @Username"
      );
    return res.json({ message: "Đã đặt lại mật khẩu. Đăng nhập với mật khẩu mới." });
  } catch (e) {
    console.error("admin-reset error:", e);
    return res.status(500).json({ message: e?.message || "Lỗi" });
  }
});

// POST /api/auth/forgot-password - gửi yêu cầu đặt lại mật khẩu
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const emailTrim = (email || "").trim().toLowerCase();

  if (!emailTrim) {
    return res.status(400).json({ message: "Vui lòng nhập email đăng ký" });
  }

  try {
    await poolConnect;

    const userResult = await pool
      .request()
      .input("Email", sql.NVarChar(255), emailTrim)
      .query("SELECT Id, Username, Email FROM Users WHERE LOWER(LTRIM(RTRIM(Email))) = @Email");

    if (!userResult.recordset.length) {
      return res.status(200).json({
        message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const userEmail = userResult.recordset[0].Email || emailTrim;
    try {
      await pool
        .request()
        .input("Email", sql.NVarChar(255), userEmail)
        .input("Token", sql.NVarChar(255), token)
        .input("ExpiresAt", sql.DateTime2, expiresAt)
        .query(
          "INSERT INTO PasswordResetTokens (Email, Token, ExpiresAt) VALUES (@Email, @Token, @ExpiresAt)"
        );
    } catch (e) {
      if (e?.message?.includes("PasswordResetTokens") || e?.message?.includes("Invalid object")) {
        return res.status(500).json({
          message: "Chức năng quên mật khẩu chưa được cấu hình. Liên hệ admin để reset mật khẩu.",
        });
      }
      throw e;
    }

    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.API_URL ||
      (req.headers.origin || req.headers.referer)?.replace(/\/$/, "") ||
      "http://localhost:8080";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    return res.status(200).json({
      message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.",
    });
  } catch (error) {
    console.error("Error during forgot-password:", error);
    return res.status(500).json({ message: "Có lỗi xảy ra. Vui lòng thử lại." });
  }
});

// POST /api/auth/reset-password - đặt lại mật khẩu với token
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token và mật khẩu mới là bắt buộc" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
  }

  try {
    await poolConnect;

    const tokenResult = await pool
      .request()
      .input("Token", sql.NVarChar(255), token)
      .query(
        "SELECT Id, Email, ExpiresAt FROM PasswordResetTokens WHERE Token = @Token"
      );

    if (!tokenResult.recordset.length) {
      return res.status(400).json({ message: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
    }

    const row = tokenResult.recordset[0];
    const expiresAt = row.ExpiresAt instanceof Date ? row.ExpiresAt : new Date(row.ExpiresAt);
    if (expiresAt < new Date()) {
      await pool.request().input("Token", sql.NVarChar(255), token).query("DELETE FROM PasswordResetTokens WHERE Token = @Token");
      return res.status(400).json({ message: "Link đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu lại." });
    }

    const hash = hashPassword(newPassword);
    await pool
      .request()
      .input("Email", sql.NVarChar(255), row.Email)
      .input("PasswordHash", sql.NVarChar(255), hash)
      .query("UPDATE Users SET PasswordHash = @PasswordHash WHERE Email = @Email");

    await pool.request().input("Token", sql.NVarChar(255), token).query("DELETE FROM PasswordResetTokens WHERE Token = @Token");

    return res.json({ message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới." });
  } catch (error) {
    console.error("Error during reset-password:", error);
    return res.status(500).json({ message: "Có lỗi xảy ra. Vui lòng thử lại." });
  }
});

export default router;

