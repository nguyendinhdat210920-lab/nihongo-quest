import express from "express";
import crypto from "crypto";
import { sql, pool, poolConnect } from "../db.js";

const router = express.Router();

const decodeUser = (value) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

// GET /api/profile - get current user profile (by x-user header)
router.get("/", async (req, res) => {
  const username = decodeUser(req.header("x-user"));
  if (!username) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("Username", sql.NVarChar(50), username)
      .query(
        "SELECT Id, Username, Email, CreatedAt FROM Users WHERE Username = @Username AND ISNULL(IsBanned, 0) = 0"
      );

    if (!result.recordset?.length) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const row = result.recordset[0];
    return res.json({
      id: row.Id,
      username: row.Username,
      email: row.Email || "",
      createdAt: row.CreatedAt,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ message: "Lỗi tải hồ sơ" });
  }
});

// PUT /api/profile - update profile (email, password)
router.put("/", async (req, res) => {
  const username = decodeUser(req.header("x-user"));
  if (!username) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  const { email, newPassword } = req.body;

  try {
    await poolConnect;

    if (newPassword?.trim()) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      }
      const hash = hashPassword(newPassword.trim());
      await pool
        .request()
        .input("Username", sql.NVarChar(50), username)
        .input("Email", sql.NVarChar(255), email?.trim() || null)
        .input("PasswordHash", sql.NVarChar(255), hash)
        .query(
          "UPDATE Users SET Email = @Email, PasswordHash = @PasswordHash WHERE Username = @Username"
        );
    } else {
      await pool
        .request()
        .input("Username", sql.NVarChar(50), username)
        .input("Email", sql.NVarChar(255), email?.trim() || null)
        .query("UPDATE Users SET Email = @Email WHERE Username = @Username");
    }

    return res.json({ message: "Đã cập nhật" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Lỗi cập nhật hồ sơ" });
  }
});

export default router;
