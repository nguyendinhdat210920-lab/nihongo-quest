/**
 * Đặt lại mật khẩu cho user trong Supabase
 * Dùng khi migrate xong nhưng không đăng nhập được (hash lỗi, v.v.)
 *
 * Cách chạy: node scripts/set-password.js <username> <password_mới>
 * Ví dụ: node scripts/set-password.js "Đình Đạt" "123456"
 */

import "dotenv/config";
import crypto from "crypto";
import pg from "pg";

const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

async function main() {
  const [username, newPassword] = process.argv.slice(2);
  if (!username || !newPassword) {
    console.log('Cách dùng: node scripts/set-password.js <username> <password_mới>');
    console.log('Ví dụ: node scripts/set-password.js "Đình Đạt" "123456"');
    process.exit(1);
  }
  if (newPassword.length < 6) {
    console.error("Mật khẩu phải có ít nhất 6 ký tự");
    process.exit(1);
  }

  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl) {
    console.error("Thiếu DATABASE_URL trong .env");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: pgUrl });
  await client.connect();

  try {
    const hash = hashPassword(newPassword);
    const r = await client.query(
      "UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username",
      [hash, username]
    );
    if (r.rowCount === 0) {
      console.error(`Không tìm thấy user "${username}" trong database.`);
      console.log("Chạy migrate-users.js trước, hoặc đăng ký tài khoản mới.");
      process.exit(1);
    }
    console.log(`Đã đặt mật khẩu mới cho "${username}". Bạn có thể đăng nhập ngay.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
