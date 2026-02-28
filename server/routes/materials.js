import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sql, pool, poolConnect } from "../db.js";

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

const checkIsAdmin = async (username) => {
  if (!username) return false;
  if (username === "Đình Đạt") return true;
  try {
    await poolConnect;
    const r = await pool
      .request()
      .input("Username", sql.NVarChar(50), username)
      .query("SELECT ISNULL(IsAdmin, 0) AS IsAdmin FROM Users WHERE Username = @Username");
    return !!r.recordset?.[0]?.IsAdmin;
  } catch {
    return false;
  }
};

// Upload directory for materials
const uploadDir = path.resolve("uploads/materials");
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// GET: all materials (only approved)
router.get("/", async (_req, res) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .query(
        "SELECT Id, Title, Course, Tags, FileUrl, FileType, UploaderName, Status, CreatedAt FROM Materials WHERE ISNULL(Status,'approved') = 'approved' ORDER BY CreatedAt DESC",
      );

    const rows = result.recordset || [];
    const mapped = rows.map((row) => ({
      id: row.Id,
      title: row.Title,
      course: row.Course,
      tags: row.Tags
        ? String(row.Tags)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      fileUrl: row.FileUrl,
      fileType: row.FileType,
      uploaderName: decodeMaybe(row.UploaderName),
      status: row.Status,
      createdAt: row.CreatedAt,
    }));

    return res.json(mapped);
  } catch (error) {
    console.error("Error fetching materials:", error);
    return res.status(500).json({ message: "Failed to fetch materials" });
  }
});

// POST: create material
router.post("/", upload.single("file"), async (req, res) => {
  const { title, course, tags } = req.body;
  const requester = decodeHeaderUser(req.header("x-user"));
  const file = req.file;

  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }

  try {
    await poolConnect;

    let fileUrl = null;
    let fileType = null;

    if (file) {
      const baseUrl = process.env.API_URL || process.env.BASE_URL || "http://localhost:3000";
      fileUrl = `${baseUrl.replace(/\/$/, "")}/uploads/materials/${file.filename}`;
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === ".pdf") fileType = "pdf";
      else if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext))
        fileType = "image";
      else fileType = ext.replace(".", "") || "file";
    }

    const tagsCsv = Array.isArray(tags)
      ? tags.join(",")
      : (tags || "").toString();

    const isAdmin = await checkIsAdmin(requester);
    const status = isAdmin ? "approved" : "pending";

    const result = await pool
      .request()
      .input("Title", sql.NVarChar(255), title)
      .input("Course", sql.NVarChar(255), course || null)
      .input("Tags", sql.NVarChar(sql.MAX), tagsCsv || null)
      .input("FileUrl", sql.NVarChar(500), fileUrl)
      .input("FileType", sql.NVarChar(50), fileType)
      .input("UploaderName", sql.NVarChar(255), requester)
      .input("Status", sql.NVarChar(50), status)
      .query(
        "INSERT INTO Materials (Title, Course, Tags, FileUrl, FileType, UploaderName, Status) OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Course, INSERTED.Tags, INSERTED.FileUrl, INSERTED.FileType, INSERTED.UploaderName, INSERTED.Status, INSERTED.CreatedAt VALUES (@Title, @Course, @Tags, @FileUrl, @FileType, @UploaderName, @Status)",
      );

    const row = result.recordset[0];
    const created = {
      id: row.Id,
      title: row.Title,
      course: row.Course,
      tags: row.Tags
        ? String(row.Tags)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      fileUrl: row.FileUrl,
      fileType: row.FileType,
      uploaderName: row.UploaderName,
      status: row.Status,
      createdAt: row.CreatedAt,
    };

    return res.status(201).json(created);
  } catch (error) {
    console.error("Error creating material:", error);
    return res.status(500).json({ message: "Failed to create material" });
  }
});

// DELETE: remove material (only uploader)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;

    const existing = await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .query(
        "SELECT Id, UploaderName, FileUrl FROM Materials WHERE Id = @Id",
      );

    if (!existing.recordset.length) {
      return res.status(404).json({ message: "Material not found" });
    }

    const material = existing.recordset[0];
    const owner = decodeMaybe(material.UploaderName);
    const isAdmin = await checkIsAdmin(requester);
    if (!isAdmin && owner && owner !== requester) {
      return res
        .status(403)
        .json({ message: "You are not allowed to delete this material" });
    }

    if (material.FileUrl) {
      const marker = "/uploads/materials/";
      const idx = material.FileUrl.indexOf(marker);
      if (idx !== -1) {
        const fileName = material.FileUrl.substring(idx + marker.length);
        const filePath = path.join(uploadDir, fileName);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.warn("Failed to delete file:", err);
          }
        }
      }
    }

    await pool
      .request()
      .input("Id", sql.Int, Number(id))
      .query("DELETE FROM Materials WHERE Id = @Id");

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting material:", error);
    return res.status(500).json({ message: "Failed to delete material" });
  }
});

export default router;

