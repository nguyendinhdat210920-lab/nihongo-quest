import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import lessonsRouter from "./routes/lessons.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import quizzesRouter from "./routes/quizzes.js";
import materialsRouter from "./routes/materials.js";
import filesRouter from "./routes/files.js";
import flashcardsRouter from "./routes/flashcards.js";
import statsRouter from "./routes/stats.js";
import profileRouter from "./routes/profile.js";
import leaderboardRouter from "./routes/leaderboard.js";
import forumRouter from "./routes/forum.js";
import chatRouter from "./routes/chat.js";
import dashboardRouter from "./routes/dashboard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-user"],
  }),
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/lessons", lessonsRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/quizzes", quizzesRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/files", filesRouter);
app.use("/api/flashcards", flashcardsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/forum", forumRouter);
app.use("/api/chat", chatRouter);
app.use("/api/dashboard", dashboardRouter);

// Serve frontend (Vite build) - try multiple possible paths (Render vs local)
const distPath = [
  path.resolve(__dirname, "..", "dist"),
  path.resolve(process.cwd(), "..", "dist"),
  path.resolve(process.cwd(), "dist"),
].find((p) => existsSync(p));

if (distPath) {
  const indexPath = path.join(distPath, "index.html");
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(indexPath, (err) => err && next());
  });
} else {
  console.warn("dist not found. Tried:", path.resolve(__dirname, "..", "dist"));
  app.get("/", (req, res) =>
    res.status(500).send("Frontend chưa build. Kiểm tra Build Command: npm run build")
  );
}

const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
    console.error(
      "Fix: run `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`, or start with PORT=3001.",
    );
    process.exit(1);
  }
  console.error("Server error:", err);
  process.exit(1);
});