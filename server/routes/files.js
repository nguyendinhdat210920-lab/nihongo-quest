import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");

const uploadsRoot = path.join(serverRoot, "uploads");
const lessonsDir = path.join(uploadsRoot, "lessons");
const materialsDir = path.join(uploadsRoot, "materials");

const extractPathname = (src) => {
  if (!src) return "";
  const s = String(src).trim();
  if (!s) return "";
  try {
    // Allow full URL (http://localhost:3000/uploads/...)
    return new URL(s).pathname || "";
  } catch {
    // Allow /uploads/... or uploads/...
    return s.startsWith("/") ? s : `/${s}`;
  }
};

const resolveUploadFile = (src) => {
  const pathname = extractPathname(src);
  if (!pathname) return null;

  const lessonsMarker = "/uploads/lessons/";
  const materialsMarker = "/uploads/materials/";

  if (pathname.includes(lessonsMarker)) {
    const fileName = path.basename(pathname.split(lessonsMarker).pop() || "");
    return fileName ? path.join(lessonsDir, fileName) : null;
  }

  if (pathname.includes(materialsMarker)) {
    const fileName = path.basename(pathname.split(materialsMarker).pop() || "");
    return fileName ? path.join(materialsDir, fileName) : null;
  }

  return null;
};

// GET /api/files/download?src=<fileUrl>
router.get("/download", async (req, res) => {
  const src = typeof req.query.src === "string" ? req.query.src : "";
  const filePath = resolveUploadFile(src);

  if (!filePath) {
    return res.status(400).json({ message: "Invalid file source" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  // Extra safety: ensure filePath stays under uploadsRoot
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(path.normalize(uploadsRoot))) {
    return res.status(400).json({ message: "Invalid file path" });
  }

  const downloadName = path.basename(filePath);
  res.setHeader("Cache-Control", "no-store");
  return res.download(filePath, downloadName);
});

export default router;

