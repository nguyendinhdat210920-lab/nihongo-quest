import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sql, poolConnect, pool } from "../db.js";

const router = express.Router();

const decodeHeaderUser = (value) => {
    if (!value) return "anonymous";
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

let cachedHasStatus = null;
let cachedHasStatusAt = 0;
const hasLessonsStatusColumn = async () => {
    if (process.env.DATABASE_URL) return true;
    const now = Date.now();
    if (cachedHasStatus != null && now - cachedHasStatusAt < 60_000) return cachedHasStatus;
    try {
        await poolConnect;
        const result = await pool.request().query("SELECT COL_LENGTH('dbo.Lessons','Status') AS ColLen");
        const len = result.recordset?.[0]?.ColLen;
        cachedHasStatus = len != null;
        cachedHasStatusAt = now;
        return cachedHasStatus;
    } catch (err) {
        console.warn("Failed to detect Lessons.Status column:", err);
        cachedHasStatus = false;
        cachedHasStatusAt = now;
        return false;
    }
};

let cachedHasIsPublic = null;
let cachedHasIsPublicAt = 0;
const hasLessonsIsPublicColumn = async () => {
    if (process.env.DATABASE_URL) return true;
    const now = Date.now();
    if (cachedHasIsPublic != null && now - cachedHasIsPublicAt < 60_000) return cachedHasIsPublic;
    try {
        await poolConnect;
        const result = await pool.request().query("SELECT COL_LENGTH('dbo.Lessons','IsPublic') AS ColLen");
        const len = result.recordset?.[0]?.ColLen;
        cachedHasIsPublic = len != null;
        cachedHasIsPublicAt = now;
        return cachedHasIsPublic;
    } catch (err) {
        console.warn("Failed to detect Lessons.IsPublic column:", err);
        cachedHasIsPublic = false;
        cachedHasIsPublicAt = now;
        return false;
    }
};

const parseIsPublic = (value) => {
    if (value == null) return true;
    const s = String(value).trim().toLowerCase();
    if (!s) return true;
    if (s === "0" || s === "false" || s === "private" || s === "onlyme") return false;
    return true;
};

// Cấu hình lưu trữ file
const uploadDir = path.resolve("uploads/lessons");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, unique + ext);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// GET: Lấy danh sách bài học
router.get("/", async (req, res) => {
    const username = req.query.username && typeof req.query.username === "string"
        ? req.query.username
        : null;

    try {
        await poolConnect;

        const hasStatus = await hasLessonsStatusColumn();
        const hasIsPublic = await hasLessonsIsPublicColumn();
        const request = pool.request();
        let query = "SELECT Id, Title, Content, CreatedBy, AttachmentUrl, AttachmentType";
        if (hasStatus) query += ", Status";
        if (hasIsPublic) query += ", IsPublic";
        query += " FROM Lessons ";

        const publicPredicate = (() => {
            if (hasStatus && hasIsPublic) return "(Status = N'approved' AND ISNULL(IsPublic, 1) = 1)";
            if (hasStatus && !hasIsPublic) return "(Status = N'approved')";
            if (!hasStatus && hasIsPublic) return "(ISNULL(IsPublic, 1) = 1)";
            return "(1 = 1)";
        })();

        if (username) {
            request.input("Username", sql.NVarChar(255), username);
            query += `WHERE ${publicPredicate} OR CreatedBy = @Username `;
        } else {
            if (publicPredicate !== "(1 = 1)") query += `WHERE ${publicPredicate} `;
        }

        query += "ORDER BY Id DESC";

        const result = await request.query(query);
        const rows = result.recordset || [];
        const mapped = rows.map((row) => ({
            ...row,
            CreatedBy: decodeMaybe(row.CreatedBy),
        }));
        res.json(mapped);
    } catch (error) {
        console.error("Failed to fetch lessons", error);
        res.status(500).json({ message: "Failed to fetch lessons" });
    }
});

// POST: Tạo bài học mới
router.post("/", upload.single("file"), async (req, res) => {
    const { title, content } = req.body;
    const requester = decodeHeaderUser(req.header("x-user"));
    const file = req.file;

    let attachmentUrl = null;
    let attachmentType = null;

    if (file) {
        const baseUrl = process.env.API_URL || process.env.BASE_URL || "http://localhost:3000";
        attachmentUrl = `${baseUrl.replace(/\/$/, "")}/uploads/lessons/${file.filename}`;
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === ".pdf") attachmentType = "pdf";
        else if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) attachmentType = "image";
        else attachmentType = "file";
    }

    try {
        await poolConnect;
        const hasStatus = await hasLessonsStatusColumn();
        const hasIsPublic = await hasLessonsIsPublicColumn();
        const isPublic = parseIsPublic(req.body.isPublic);
        const request = pool
            .request()
            .input("Title", sql.NVarChar(255), title)
            .input("Content", sql.NVarChar(sql.MAX), content)
            .input("CreatedBy", sql.NVarChar(255), requester)
            .input("AttachmentUrl", sql.NVarChar(500), attachmentUrl)
            .input("AttachmentType", sql.NVarChar(50), attachmentType);

        if (hasIsPublic) request.input("IsPublic", sql.Bit, !!isPublic);

        let query = "";
        if (hasStatus && hasIsPublic) {
            query =
                "INSERT INTO Lessons (Title, Content, CreatedBy, AttachmentUrl, AttachmentType, Status, IsPublic) OUTPUT INSERTED.* VALUES (@Title, @Content, @CreatedBy, @AttachmentUrl, @AttachmentType, N'pending', @IsPublic)";
        } else if (hasStatus && !hasIsPublic) {
            query =
                "INSERT INTO Lessons (Title, Content, CreatedBy, AttachmentUrl, AttachmentType, Status) OUTPUT INSERTED.* VALUES (@Title, @Content, @CreatedBy, @AttachmentUrl, @AttachmentType, N'pending')";
        } else if (!hasStatus && hasIsPublic) {
            query =
                "INSERT INTO Lessons (Title, Content, CreatedBy, AttachmentUrl, AttachmentType, IsPublic) OUTPUT INSERTED.* VALUES (@Title, @Content, @CreatedBy, @AttachmentUrl, @AttachmentType, @IsPublic)";
        } else {
            query =
                "INSERT INTO Lessons (Title, Content, CreatedBy, AttachmentUrl, AttachmentType) OUTPUT INSERTED.* VALUES (@Title, @Content, @CreatedBy, @AttachmentUrl, @AttachmentType)";
        }

        const result = await request.query(query);
        const row = result.recordset[0];
        res.status(201).json({
            ...row,
            CreatedBy: decodeMaybe(row.CreatedBy),
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to create lesson" });
    }
});

// PUT: Cập nhật bài học
router.put("/:id", upload.single("file"), async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const requester = decodeHeaderUser(req.header("x-user"));
    
    try {
        await poolConnect;
        const check = await pool.request().input("Id", sql.Int, id).query("SELECT CreatedBy, AttachmentUrl, AttachmentType FROM Lessons WHERE Id = @Id");
        const lesson = check.recordset[0];

        const owner = decodeMaybe(lesson.CreatedBy);
        if (owner && owner !== requester) {
            return res.status(403).json({ message: "You are not allowed to edit this lesson" });
        }

        let attachmentUrl = lesson.AttachmentUrl;
        let attachmentType = lesson.AttachmentType;

        if (req.file) {
            const baseUrl = process.env.API_URL || process.env.BASE_URL || "http://localhost:3000";
            attachmentUrl = `${baseUrl.replace(/\/$/, "")}/uploads/lessons/${req.file.filename}`;
            attachmentType = path.extname(req.file.originalname).toLowerCase() === ".pdf" ? "pdf" : "image";
        }

        const hasIsPublic = await hasLessonsIsPublicColumn();
        const request = pool.request()
            .input("Id", sql.Int, id)
            .input("Title", sql.NVarChar(255), title)
            .input("Content", sql.NVarChar(sql.MAX), content)
            .input("Url", sql.NVarChar(500), attachmentUrl)
            .input("Type", sql.NVarChar(50), attachmentType);
        if (hasIsPublic) request.input("IsPublic", sql.Bit, !!parseIsPublic(req.body.isPublic));

        const query = hasIsPublic
            ? "UPDATE Lessons SET Title = @Title, Content = @Content, AttachmentUrl = @Url, AttachmentType = @Type, IsPublic = @IsPublic WHERE Id = @Id"
            : "UPDATE Lessons SET Title = @Title, Content = @Content, AttachmentUrl = @Url, AttachmentType = @Type WHERE Id = @Id";

        await request.query(query);
        
        res.json({ message: "Updated" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update" });
    }
});

// GET: Lấy link chia sẻ (bấm nút Chia sẻ) - phải đặt trước GET /:id
router.get("/:id/share-link", async (req, res) => {
    const { id } = req.params;
    const requester = decodeHeaderUser(req.header("x-user"));

    try {
        await poolConnect;
        const check = await pool.request().input("Id", sql.Int, id).query("SELECT CreatedBy FROM Lessons WHERE Id = @Id");
        if (!check.recordset?.length) return res.status(404).json({ message: "Lesson not found" });
        const owner = decodeMaybe(check.recordset[0].CreatedBy);
        if (owner !== requester) return res.status(403).json({ message: "Chỉ tác giả mới tạo link chia sẻ" });

        const crypto = await import("crypto");
        const token = crypto.randomBytes(24).toString("hex");
        const baseUrl = (process.env.SITE_URL || process.env.API_URL || process.env.BASE_URL || (req.protocol + "://" + (req.get("host") || "localhost:5173"))).replace(/\/$/, "").replace(/\/api$/, "");

        try {
            await pool.request()
                .input("LessonId", sql.Int, id)
                .input("Token", sql.NVarChar(64), token)
                .query("INSERT INTO LessonShareTokens (LessonId, Token) VALUES (@LessonId, @Token) ON CONFLICT (LessonId) DO UPDATE SET Token = @Token");
        } catch (e) {
            if (e?.message?.includes("lesson_share_tokens")) {
                return res.status(400).json({ message: "Chạy server/sql/share-links.sql" });
            }
            throw e;
        }

        const url = `${baseUrl}/lessons?share=${id}&token=${token}`;
        res.json({ url });
    } catch (e) {
        res.status(500).json({ message: "Failed" });
    }
});

// GET: Lấy 1 bài học (cho link chia sẻ hoặc xem chi tiết)
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const token = req.query.token && typeof req.query.token === "string" ? req.query.token : null;

    try {
        await poolConnect;
        const hasStatus = await hasLessonsStatusColumn();
        const hasIsPublic = await hasLessonsIsPublicColumn();
        let query = "SELECT Id, Title, Content, CreatedBy, AttachmentUrl, AttachmentType";
        if (hasStatus) query += ", Status";
        if (hasIsPublic) query += ", IsPublic";
        query += " FROM Lessons WHERE Id = @Id";

        const result = await pool.request().input("Id", sql.Int, id).query(query);
        if (!result.recordset?.length) return res.status(404).json({ message: "Lesson not found" });

        const row = result.recordset[0];
        const isPublic = hasIsPublic ? !!row.IsPublic : true;
        const creator = decodeMaybe(row.CreatedBy);
        const requester = decodeHeaderUser(req.header("x-user"));

        if (!isPublic && creator !== requester) {
            if (token) {
                try {
                    const tok = await pool.request().input("LessonId", sql.Int, id).input("Token", sql.NVarChar(64), token)
                        .query("SELECT 1 FROM LessonShareTokens WHERE LessonId = @LessonId AND Token = @Token");
                    if (!tok.recordset?.length) return res.status(404).json({ message: "Lesson not found" });
                } catch {
                    return res.status(404).json({ message: "Lesson not found" });
                }
            } else {
                return res.status(404).json({ message: "Lesson not found" });
            }
        }

        res.json({ ...row, CreatedBy: creator });
    } catch (e) {
        res.status(500).json({ message: "Failed" });
    }
});

// DELETE: Xóa bài học
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const requester = decodeHeaderUser(req.header("x-user"));

    try {
        await poolConnect;
        const check = await pool.request().input("Id", sql.Int, id).query("SELECT CreatedBy FROM Lessons WHERE Id = @Id");
        const owner = decodeMaybe(check.recordset[0].CreatedBy);
        if (owner !== requester) return res.status(403).json({ message: "Forbidden" });

        await pool.request().input("Id", sql.Int, id).query("DELETE FROM Lessons WHERE Id = @Id");
        res.json({ message: "Deleted" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete" });
    }
});

export default router;