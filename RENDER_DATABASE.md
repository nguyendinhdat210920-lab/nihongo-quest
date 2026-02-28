# Cấu hình DATABASE_URL cho Render

## Kiểm tra kết nối

Sau khi deploy, mở: **https://nihongo-quest-3080.onrender.com/api/health**

- `{"ok":true,"db":true}` → Kết nối DB thành công
- `{"ok":false,"error":"..."}` → Lỗi kết nối, xem chi tiết trong `error`

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
