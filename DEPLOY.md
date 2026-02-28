# Hướng dẫn Deploy NihonGo Quest (KHÔNG CẦN THẺ)

## Kiến trúc

- **Frontend** (React) → Vercel (`*.vercel.app`)
- **Backend** (Node.js) → Render (`*.onrender.com`)
- **Database** → **Supabase** (PostgreSQL, free, không cần thẻ)

---

## Bước 1: Supabase (đã có)

- Database đã dùng Supabase
- Schema đã chạy (`server/sql/schema-postgres.sql`)
- Copy **Connection string** từ Supabase → Settings → Database (encode mật khẩu: `@` → `%40`, `$` → `%24`)

---

## Bước 2: Đẩy code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

- Đảm bảo `.env` có trong `.gitignore` (đã có)
- **Không** commit file `.env`

---

## Bước 3: Deploy Backend lên Render

1. Vào [render.com](https://render.com) → Sign up (GitHub)
2. **New** → **Web Service** → Connect GitHub repo
3. Cấu hình:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
4. **Environment Variables** (thêm):
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres` |
   | `API_URL` | `https://YOUR-SERVICE.onrender.com` (điền sau khi deploy) |
   | `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (điền sau) |
5. **Create Web Service** → chờ deploy xong → copy URL (vd: `https://nihongo-quest-api.onrender.com`)

---

## Bước 4: Deploy Frontend lên Vercel

1. Vào [vercel.com](https://vercel.com) → Sign up (GitHub)
2. **Add New** → **Project** → Import repo GitHub
3. Cấu hình:
   - **Root Directory**: để trống (hoặc `.`)
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://YOUR-SERVICE.onrender.com` (URL backend Render) |
5. **Deploy** → copy URL (vd: `https://nihongo-quest.vercel.app`)

---

## Bước 5: Cập nhật Backend (quan trọng)

1. Vào Render → Service → **Environment**
2. Sửa:
   - `API_URL` = `https://YOUR-SERVICE.onrender.com` (URL backend của bạn)
   - `FRONTEND_URL` = `https://YOUR-APP.vercel.app` (URL Vercel của bạn)
3. **Save Changes** → **Manual Deploy** → **Deploy latest commit**

---

## Checklist nhanh

- [ ] Code đã push lên GitHub
- [ ] Supabase: DATABASE_URL đã có
- [ ] Render: Backend deploy xong, có URL
- [ ] Vercel: Frontend deploy xong, có URL
- [ ] Render: Đã cập nhật API_URL, FRONTEND_URL
- [ ] Vercel: Đã set VITE_API_URL = URL backend

---

## Lưu ý

- **Supabase**: Free 500MB, không cần thẻ
- **File upload**: Render free có filesystem tạm — file upload có thể mất khi redeploy
- **Cold start**: Render free sleep sau 15 phút — lần đầu truy cập có thể chậm ~30s
