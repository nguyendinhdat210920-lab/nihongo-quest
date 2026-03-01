import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sql, pool, poolConnect } from "../db.js";

const router = express.Router();

const baseUrl = process.env.API_URL || "http://localhost:3000";

const forumUploadDir = path.resolve("uploads/forum");
if (!fs.existsSync(forumUploadDir)) {
  fs.mkdirSync(forumUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: forumUploadDir,
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

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
    await poolConnect;
    const r = await pool
      .request()
      .input("Username", sql.NVarChar(50), username)
      .query("SELECT ISNULL(IsAdmin, 0) AS IsAdmin FROM Users WHERE Username = @Username");
    return !!r.recordset?.[0]?.IsAdmin;
  } catch {
    return username === "Đình Đạt";
  }
};

// GET /api/forum/posts - list posts with pagination and search
router.get("/posts", async (req, res) => {
  const requester = decodeHeaderUser(req.header("x-user"));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 10));
  const search = (req.query.search || "").trim();
  const offset = (page - 1) * limit;

  try {
    await poolConnect;

    let whereClause = "WHERE p.Status = N'approved'";
    if (search) {
      whereClause += " AND (p.Title LIKE @Search OR p.Content LIKE @Search OR p.AuthorUsername LIKE @Search)";
    }

    const countReq = pool.request();
    if (search) countReq.input("Search", sql.NVarChar(255), `%${search}%`);
    const countResult = await countReq.query(`
      SELECT COUNT(*) AS Total FROM ForumPosts p ${whereClause}
    `);
    const total = countResult.recordset?.[0]?.Total ?? countResult.recordset?.[0]?.total ?? 0;

    const mainReq = pool.request();
    if (search) mainReq.input("Search", sql.NVarChar(255), `%${search}%`);
    mainReq.input("Offset", sql.Int, offset);
    mainReq.input("Limit", sql.Int, limit);

    const result = await mainReq.query(`
      SELECT p.Id, p.Title, p.Content, p.AuthorUsername, p.Status, p.CreatedAt, p.FileUrl, p.FileName, p.FileType,
        ISNULL(u.IsAdmin, 0) AS AuthorIsAdmin,
        (SELECT COUNT(*) FROM ForumComments c WHERE c.PostId = p.Id) AS CommentCount,
        (SELECT COUNT(*) FROM ForumLikes l WHERE l.PostId = p.Id) AS LikeCount
      FROM ForumPosts p
      LEFT JOIN Users u ON u.Username = p.AuthorUsername
      ${whereClause}
      ORDER BY p.CreatedAt DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
    `);

    const rows = result.recordset || [];
    const postIds = rows.map((r) => r.Id);

    let likedSet = new Set();
    if (requester && postIds.length) {
      try {
        const likedResult = await pool
          .request()
          .input("Username", sql.NVarChar(255), requester)
          .query(
            `SELECT PostId FROM ForumLikes WHERE Username = @Username AND PostId IN (${postIds.join(",")})`
          );
        likedSet = new Set((likedResult.recordset || []).map((r) => r.PostId));
      } catch {
        // ForumLikes table may not exist yet
      }
    }

    const posts = rows.map((row) => ({
      id: row.Id,
      title: row.Title || "",
      content: row.Content || "",
      authorName: decodeMaybe(row.AuthorUsername),
      authorIsAdmin: !!row.AuthorIsAdmin,
      status: row.Status || "approved",
      likes: row.LikeCount ?? row.Likecount ?? 0,
      commentCount: row.CommentCount ?? row.Commentcount ?? 0,
      createdAt: row.CreatedAt,
      liked: likedSet.has(row.Id),
      fileUrl: row.FileUrl || null,
      fileName: row.FileName || null,
      fileType: row.FileType || null,
    }));

    return res.json({
      posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("Error fetching forum posts:", error);
    return res.status(500).json({ message: "Failed to fetch posts" });
  }
});

// POST /api/forum/posts - create post (requires auth), optional file
router.post("/posts", upload.single("file"), async (req, res) => {
  const title = req.body?.title?.trim();
  const content = req.body?.content?.trim();
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!requester) {
    return res.status(401).json({ message: "Vui lòng đăng nhập để đăng bài" });
  }

  if (!title || !content) {
    return res.status(400).json({ message: "Tiêu đề và nội dung là bắt buộc" });
  }

  let fileUrl = null;
  let fileName = null;
  let fileType = null;
  if (req.file) {
    fileUrl = `${baseUrl}/uploads/forum/${req.file.filename}`;
    fileName = req.file.originalname || req.file.filename;
    fileType = (req.file.mimetype || "").split("/")[0];
  }

  const status = (await checkIsAdmin(requester)) ? "approved" : "pending";

  try {
    await poolConnect;

    const request = pool
      .request()
      .input("Title", sql.NVarChar(255), title)
      .input("Content", sql.NVarChar(sql.MAX), content)
      .input("AuthorUsername", sql.NVarChar(255), requester)
      .input("FileUrl", sql.NVarChar(500), fileUrl)
      .input("FileName", sql.NVarChar(255), fileName)
      .input("FileType", sql.NVarChar(50), fileType)
      .input("Status", sql.NVarChar(20), status);

    const result = await request.query(`
      INSERT INTO ForumPosts (Title, Content, AuthorUsername, FileUrl, FileName, FileType, Status)
      OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Content, INSERTED.AuthorUsername, INSERTED.CreatedAt, INSERTED.FileUrl, INSERTED.FileName, INSERTED.FileType, INSERTED.Status
      VALUES (@Title, @Content, @AuthorUsername, @FileUrl, @FileName, @FileType, @Status)
    `);

    const row = result.recordset[0];
    return res.status(201).json({
      id: row.Id,
      title: row.Title,
      content: row.Content,
      authorName: decodeMaybe(row.AuthorUsername),
      status: row.Status || status,
      likes: 0,
      commentCount: 0,
      createdAt: row.CreatedAt,
      fileUrl: row.FileUrl || null,
      fileName: row.FileName || null,
      fileType: row.FileType || null,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ message: "Không thể đăng bài" });
  }
});

// GET /api/forum/posts/pending - list pending posts (admin only)
router.get("/posts/pending", async (req, res) => {
  const requester = decodeHeaderUser(req.header("x-user"));
  if (!requester || !(await checkIsAdmin(requester))) {
    return res.status(403).json({ message: "Chỉ admin mới xem được bài chờ duyệt" });
  }

  try {
    await poolConnect;
    const result = await pool.request().query(`
      SELECT p.Id, p.Title, p.Content, p.AuthorUsername, p.Status, p.CreatedAt, p.FileUrl, p.FileName, p.FileType,
        (SELECT COUNT(*) FROM ForumComments c WHERE c.PostId = p.Id) AS CommentCount,
        (SELECT COUNT(*) FROM ForumLikes l WHERE l.PostId = p.Id) AS LikeCount
      FROM ForumPosts p
      WHERE p.Status = N'pending'
      ORDER BY p.CreatedAt ASC
    `);
    const rows = result.recordset || [];
    const posts = rows.map((row) => ({
      id: row.Id,
      title: row.Title || "",
      content: row.Content || "",
      authorName: decodeMaybe(row.AuthorUsername),
      status: row.Status || "pending",
      likes: row.LikeCount ?? row.Likecount ?? 0,
      commentCount: row.CommentCount ?? row.Commentcount ?? 0,
      createdAt: row.CreatedAt,
      fileUrl: row.FileUrl || null,
      fileName: row.FileName || null,
      fileType: row.FileType || null,
    }));
    return res.json(posts);
  } catch (error) {
    console.error("Error fetching pending posts:", error);
    return res.status(500).json({ message: "Failed to fetch pending posts" });
  }
});

// PUT /api/forum/posts/:id/status - approve or reject (admin only)
router.put("/posts/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!requester || !(await checkIsAdmin(requester))) {
    return res.status(403).json({ message: "Chỉ admin mới duyệt bài" });
  }
  if (status !== "approved" && status !== "rejected") {
    return res.status(400).json({ message: "Status phải là approved hoặc rejected" });
  }

  try {
    await poolConnect;
    const check = await pool.request().input("Id", sql.Int, id).query("SELECT Id FROM ForumPosts WHERE Id = @Id");
    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Status", sql.NVarChar(20), status)
      .query("UPDATE ForumPosts SET Status = @Status WHERE Id = @Id");
    return res.json({ message: status === "approved" ? "Đã duyệt" : "Đã từ chối" });
  } catch (error) {
    console.error("Error updating post status:", error);
    return res.status(500).json({ message: "Không thể cập nhật" });
  }
});

// GET /api/forum/posts/:id - get post with comments
router.get("/posts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await poolConnect;

    const postResult = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(`
        SELECT p.Id, p.Title, p.Content, p.AuthorUsername, p.Status, p.CreatedAt, p.FileUrl, p.FileName, p.FileType,
          ISNULL(u.IsAdmin, 0) AS AuthorIsAdmin,
          (SELECT COUNT(*) FROM ForumComments c WHERE c.PostId = p.Id) AS CommentCount,
          (SELECT COUNT(*) FROM ForumLikes l WHERE l.PostId = p.Id) AS LikeCount
        FROM ForumPosts p
        LEFT JOIN Users u ON u.Username = p.AuthorUsername
        WHERE p.Id = @Id AND p.Status = N'approved'
      `);

    if (!postResult.recordset?.length) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }

    const row = postResult.recordset[0];
    const post = {
      id: row.Id,
      title: row.Title || "",
      content: row.Content || "",
      authorName: decodeMaybe(row.AuthorUsername),
      authorIsAdmin: !!row.AuthorIsAdmin,
      status: row.Status || "approved",
      likes: row.LikeCount ?? row.Likecount ?? 0,
      commentCount: row.CommentCount ?? row.Commentcount ?? 0,
      createdAt: row.CreatedAt,
      fileUrl: row.FileUrl || null,
      fileName: row.FileName || null,
      fileType: row.FileType || null,
    };

    const commentsResult = await pool
      .request()
      .input("PostId", sql.Int, id)
      .query(`
        SELECT Id, PostId, AuthorUsername, Content, CreatedAt
        FROM ForumComments
        WHERE PostId = @PostId
        ORDER BY CreatedAt ASC
      `);

    const comments = (commentsResult.recordset || []).map((r) => ({
      id: r.Id,
      postId: r.PostId,
      authorName: decodeMaybe(r.AuthorUsername),
      content: r.Content || "",
      createdAt: r.CreatedAt,
    }));

    return res.json({ post, comments });
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({ message: "Failed to fetch post" });
  }
});

// POST /api/forum/posts/:id/comments - add comment
router.post("/posts/:id/comments", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!requester) {
    return res.status(401).json({ message: "Vui lòng đăng nhập để bình luận" });
  }

  if (!content?.trim()) {
    return res.status(400).json({ message: "Nội dung bình luận là bắt buộc" });
  }

  try {
    await poolConnect;

    const check = await pool
      .request()
      .input("Id", sql.Int, id)
      .query("SELECT Id FROM ForumPosts WHERE Id = @Id AND Status = N'approved'");

    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }

    const result = await pool
      .request()
      .input("PostId", sql.Int, id)
      .input("AuthorUsername", sql.NVarChar(255), requester)
      .input("Content", sql.NVarChar(sql.MAX), content.trim())
      .query(`
        INSERT INTO ForumComments (PostId, AuthorUsername, Content)
        OUTPUT INSERTED.Id, INSERTED.PostId, INSERTED.AuthorUsername, INSERTED.Content, INSERTED.CreatedAt
        VALUES (@PostId, @AuthorUsername, @Content)
      `);

    const row = result.recordset[0];
    return res.status(201).json({
      id: row.Id,
      postId: row.PostId,
      authorName: decodeMaybe(row.AuthorUsername),
      content: row.Content,
      createdAt: row.CreatedAt,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({ message: "Không thể thêm bình luận" });
  }
});

// POST /api/forum/posts/:id/like - toggle like
router.post("/posts/:id/like", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!requester) {
    return res.status(401).json({ message: "Vui lòng đăng nhập để thích bài viết" });
  }

  try {
    await poolConnect;

    const check = await pool
      .request()
      .input("Id", sql.Int, id)
      .query("SELECT Id FROM ForumPosts WHERE Id = @Id AND Status = N'approved'");

    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }

    const existing = await pool
      .request()
      .input("PostId", sql.Int, id)
      .input("Username", sql.NVarChar(255), requester)
      .query("SELECT 1 FROM ForumLikes WHERE PostId = @PostId AND Username = @Username");

    if (existing.recordset?.length) {
      await pool
        .request()
        .input("PostId", sql.Int, id)
        .input("Username", sql.NVarChar(255), requester)
        .query("DELETE FROM ForumLikes WHERE PostId = @PostId AND Username = @Username");
    } else {
      await pool
        .request()
        .input("PostId", sql.Int, id)
        .input("Username", sql.NVarChar(255), requester)
        .query("INSERT INTO ForumLikes (PostId, Username) VALUES (@PostId, @Username)");
    }

    const countResult = await pool
      .request()
      .input("PostId", sql.Int, id)
      .query("SELECT COUNT(*) AS Cnt FROM ForumLikes WHERE PostId = @PostId");

    const likes = countResult.recordset[0]?.Cnt ?? countResult.recordset[0]?.cnt ?? 0;
    const liked = !existing.recordset?.length;

    return res.json({ likes, liked });
  } catch (error) {
    console.error("Error toggling like:", error);
    return res.status(500).json({ message: "Không thể thích bài viết" });
  }
});

// GET /api/forum/posts/:id/liked - check if current user liked (for UI)
router.get("/posts/:id/liked", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!requester) {
    return res.json({ liked: false });
  }

  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("PostId", sql.Int, id)
      .input("Username", sql.NVarChar(255), requester)
      .query("SELECT 1 FROM ForumLikes WHERE PostId = @PostId AND Username = @Username");

    return res.json({ liked: !!result.recordset?.length });
  } catch (error) {
    return res.json({ liked: false });
  }
});

// DELETE /api/forum/posts/:id - delete own post
router.delete("/posts/:id", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!requester) {
    return res.status(401).json({ message: "Vui lòng đăng nhập" });
  }

  try {
    await poolConnect;

    const check = await pool
      .request()
      .input("Id", sql.Int, id)
      .query("SELECT AuthorUsername FROM ForumPosts WHERE Id = @Id");

    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }

    const owner = decodeMaybe(check.recordset[0].AuthorUsername);
    const isAdmin = await checkIsAdmin(requester);
    if (owner !== requester && !isAdmin) {
      return res.status(403).json({ message: "Chỉ tác giả hoặc admin mới có thể xóa bài viết" });
    }

    await pool.request().input("Id", sql.Int, id).query("DELETE FROM ForumPosts WHERE Id = @Id");

    return res.json({ message: "Đã xóa" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Không thể xóa bài viết" });
  }
});

export default router;
