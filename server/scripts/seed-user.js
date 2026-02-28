/**
 * Tạo user mẫu trong Supabase (khi chưa có user nào)
 *
 * Cách chạy: node scripts/seed-user.js [username] [password]
 * Mặc định: username="Đình Đạt", password="123456"
 */

import "dotenv/config";
import crypto from "crypto";
import pg from "pg";

const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

async function main() {
  const username = process.argv[2] || "Đình Đạt";
  const password = process.argv[3] || "123456";

  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl) {
    console.error("Thiếu DATABASE_URL trong .env");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: pgUrl });
  await client.connect();

  try {
    const hash = hashPassword(password);
    await client.query(
      `INSERT INTO users (username, email, password_hash, is_banned, is_admin)
       VALUES ($1, $2, $3, false, true)
       ON CONFLICT (username) DO UPDATE SET password_hash = $3, is_admin = true`,
      [username, `${username.replace(/\s/g, "")}@test.com`, hash]
    );
    console.log(`Đã tạo/cập nhật user "${username}" với mật khẩu "${password}".`);
    console.log("Bạn có thể đăng nhập ngay.");
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
