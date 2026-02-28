/**
 * Migrate users từ SQL Server sang PostgreSQL (Supabase)
 *
 * Cách chạy:
 * 1. Tạo file .env.migrate (hoặc tạm sửa .env) với CẢ HAI:
 *    - SQL Server: DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD
 *    - PostgreSQL: DATABASE_URL (Supabase connection string)
 * 2. Chạy: node scripts/migrate-users.js
 *
 * Ví dụ .env.migrate:
 *   DB_SERVER=localhost
 *   DB_NAME=NihongoDB
 *   DB_USER=sa
 *   DB_PASSWORD=123
 *   DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
 */

import "dotenv/config";
import mssql from "mssql";
import pg from "pg";

const mssqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { trustServerCertificate: true },
};

const pgUrl = process.env.DATABASE_URL;

async function migrate() {
  if (!pgUrl) {
    console.error("Thiếu DATABASE_URL trong .env");
    process.exit(1);
  }
  if (!process.env.DB_SERVER || !process.env.DB_NAME) {
    console.error("Thiếu DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD cho SQL Server");
    process.exit(1);
  }

  console.log("Đang kết nối SQL Server...");
  const mssqlPool = await mssql.connect(mssqlConfig);

  console.log("Đang kết nối PostgreSQL...");
  const pgClient = new pg.Client({ connectionString: pgUrl });
  await pgClient.connect();

  try {
    const result = await mssqlPool.request().query(`
      SELECT Id, Username, Email, PasswordHash,
             ISNULL(IsBanned, 0) AS IsBanned,
             ISNULL(IsAdmin, 0) AS IsAdmin,
             CreatedAt
      FROM Users
    `);

    const users = result.recordset;
    console.log(`Tìm thấy ${users.length} user(s) trong SQL Server`);

    if (users.length === 0) {
      console.log("Không có user nào để migrate.");
      return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const u of users) {
      try {
        await pgClient.query(
          `INSERT INTO users (username, email, password_hash, is_banned, is_admin, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (username) DO UPDATE SET
             email = EXCLUDED.email,
             password_hash = EXCLUDED.password_hash,
             is_banned = EXCLUDED.is_banned,
             is_admin = EXCLUDED.is_admin`,
          [
            u.Username,
            u.Email || null,
            u.PasswordHash,
            !!u.IsBanned,
            !!u.IsAdmin,
            u.CreatedAt ? new Date(u.CreatedAt) : new Date(),
          ]
        );
        migrated++;
        console.log(`  ✓ ${u.Username}`);
      } catch (err) {
        if (err.code === "23505") {
          skipped++;
          console.log(`  - ${u.Username} (đã tồn tại, bỏ qua)`);
        } else {
          console.error(`  ✗ ${u.Username}:`, err.message);
        }
      }
    }

    console.log(`\nXong! Migrated: ${migrated}, Bỏ qua: ${skipped}`);
  } finally {
    await mssqlPool.close();
    await pgClient.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
