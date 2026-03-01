# Cấu hình DATABASE_URL cho Render

## Kiểm tra server

Sau khi deploy, thử lần lượt:

1. **https://nihongo-quest-3080.onrender.com/api/ping** → Phải thấy `{"pong":true}`
2. **https://nihongo-quest-3080.onrender.com/api/health** → `{"ok":true,"db":true}` = DB OK

**Nếu thấy "Not Found":**
- Render có thể đang deploy **Static Site** thay vì **Web Service**
- Vào Render → **Settings** → kiểm tra **Service Type** phải là **Web Service**
- **Start Command** phải là: `cd server && node server.js`
- **Root Directory** để **trống**

## Connection string

### 1. Direct (đang dùng)
```
postgresql://postgres:[PASSWORD]@db.fliybguqwcftsxakxhde.supabase.co:5432/postgres
```

### 2. Pooler (nếu direct lỗi - dùng Session mode)
Lấy từ Supabase → Settings → Database → Connection string → **Session pooler**

```
postgresql://postgres.fliybguqwcftsxakxhde:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

**Lưu ý:** Mật khẩu có ký tự đặc biệt cần encode: `@` → `%40`, `$` → `%24`

**Chia sẻ bài học & quiz:** Chạy `server/sql/lesson-shares.sql` và `server/sql/quiz-shares.sql` trong Supabase SQL Editor (nếu bảng chưa có).

---

## Reset mật khẩu qua API (không cần SQL)

1. Vào Render → **Environment** → thêm:
   - **Key:** `ADMIN_RESET_SECRET`
   - **Value:** `nihongo2024` (hoặc chuỗi bí mật bạn chọn)

2. Deploy lại, rồi gọi API (Postman, curl, hoặc browser console):

```
POST https://nihongo-quest-3o80.onrender.com/api/auth/admin-reset
Content-Type: application/json

{"username":"Đình Đạt","newPassword":"123456","secret":"nihongo2024"}
```

3. Đăng nhập với mật khẩu mới. Sau đó có thể xóa `ADMIN_RESET_SECRET` trên Render.
