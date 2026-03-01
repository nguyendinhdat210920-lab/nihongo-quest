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
            query += `WHERE ${publicPredicate} OR CreatedBy = @Username OR Id IN (SELECT LessonId FROM LessonShares WHERE SharedWithUsername = @Username) `;
        } else {
            if (publicPredicate !== "(1 = 1)") query += `WHERE ${publicPredicate} `;
        }

        query += "ORDER BY Id DESC";

        let result;
        try {
            result = await request.query(query);
        } catch (e) {
            if (e?.message?.includes("lesson_shares") || e?.message?.includes("does not exist")) {
                const fallbackQuery = `SELECT Id, Title, Content, CreatedBy, AttachmentUrl, AttachmentType${hasStatus ? ", Status" : ""}${hasIsPublic ? ", IsPublic" : ""} FROM Lessons WHERE ${publicPredicate}${username ? " OR CreatedBy = @Username" : ""} ORDER BY Id DESC`;
                result = await request.query(fallbackQuery);
            } else throw e;
        }
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

// GET: Danh sách người được chia sẻ
router.get("/:id/shares", async (req, res) => {
    const { id } = req.params;
    const requester = decodeHeaderUser(req.header("x-user"));

    try {
        await poolConnect;
        const check = await pool.request().input("Id", sql.Int, id).query("SELECT CreatedBy FROM Lessons WHERE Id = @Id");
        if (!check.recordset?.length) return res.status(404).json({ message: "Lesson not found" });
        const owner = decodeMaybe(check.recordset[0].CreatedBy);
        if (owner !== requester) return res.status(403).json({ message: "Chỉ tác giả mới xem được danh sách chia sẻ" });

        const result = await pool.request().input("LessonId", sql.Int, id)
            .query("SELECT SharedWithUsername FROM LessonShares WHERE LessonId = @LessonId");
        const list = (result.recordset || []).map((r) => decodeMaybe(r.SharedWithUsername ?? r.SharedwithUsername) || "").filter(Boolean);
        res.json({ sharedWith: list });
    } catch (e) {
        if (e?.message?.includes("lesson_shares") || e?.message?.includes("does not exist")) {
            return res.json({ sharedWith: [] });
        }
        res.status(500).json({ message: "Failed to fetch shares" });
    }
});

// POST: Chia sẻ bài học với học viên
router.post("/:id/share", async (req, res) => {
    const { id } = req.params;
    const { username: shareUsername } = req.body;
    const requester = decodeHeaderUser(req.header("x-user"));

    if (!shareUsername || typeof shareUsername !== "string") {
        return res.status(400).json({ message: "Cần username người được chia sẻ" });
    }

    try {
        await poolConnect;
        const check = await pool.request().input("Id", sql.Int, id).query("SELECT CreatedBy FROM Lessons WHERE Id = @Id");
        if (!check.recordset?.length) return res.status(404).json({ message: "Lesson not found" });
        const owner = decodeMaybe(check.recordset[0].CreatedBy);
        if (owner !== requester) return res.status(403).json({ message: "Chỉ tác giả mới chia sẻ được" });

        await pool.request()
            .input("LessonId", sql.Int, id)
            .input("SharedWithUsername", sql.NVarChar(255), shareUsername.trim())
            .query("INSERT INTO LessonShares (LessonId, SharedWithUsername) VALUES (@LessonId, @SharedWithUsername) ON CONFLICT (LessonId, SharedWithUsername) DO NOTHING");
        res.json({ message: "Đã chia sẻ" });
    } catch (e) {
        if (e?.message?.includes("lesson_shares") || e?.message?.includes("does not exist")) {
            return res.status(400).json({ message: "Chưa có bảng chia sẻ. Chạy server/sql/lesson-shares.sql" });
        }
        res.status(500).json({ message: "Không thể chia sẻ" });
    }
});

// DELETE: Bỏ chia sẻ
router.delete("/:id/share/:username", async (req, res) => {
    const { id, username } = req.params;
    const requester = decodeHeaderUser(req.header("x-user"));

    try {
        await poolConnect;
        const check = await pool.request().input("Id", sql.Int, id).query("SELECT CreatedBy FROM Lessons WHERE Id = @Id");
        if (!check.recordset?.length) return res.status(404).json({ message: "Lesson not found" });
        const owner = decodeMaybe(check.recordset[0].CreatedBy);
        if (owner !== requester) return res.status(403).json({ message: "Forbidden" });

        await pool.request()
            .input("LessonId", sql.Int, id)
            .input("SharedWithUsername", sql.NVarChar(255), decodeURIComponent(username))
            .query("DELETE FROM LessonShares WHERE LessonId = @LessonId AND SharedWithUsername = @SharedWithUsername");
        res.json({ message: "Đã bỏ chia sẻ" });
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