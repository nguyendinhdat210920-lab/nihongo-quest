import express from "express";
import { randomBytes } from "crypto";
import { sql, pool, poolConnect } from "../db.js";

const router = express.Router();

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
    return false;
  }
};

const parseChoicesFromRow = (raw) => {
  if (raw == null || raw === "") return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : [];
  } catch {
    return [];
  }
};

// GET /api/flashcards/shared/:token — mở deck qua link (kể cả deck riêng tư)
router.get("/shared/:token", async (req, res) => {
  const token = typeof req.params.token === "string" ? req.params.token.trim() : "";
  if (!token || token.length > 40) {
    return res.status(400).json({ message: "Token không hợp lệ" });
  }

  try {
    await poolConnect;

    const deckResult = await pool
      .request()
      .input("Token", sql.NVarChar(40), token)
      .query(
        `SELECT Id, Title, Description, OwnerUsername, JlptLevel, IsPublic, CreatedAt, ShareToken, ISNULL(IsOfficial, 0) AS IsOfficial
         FROM Decks WHERE ShareToken = @Token`
      );

    if (!deckResult.recordset?.length) {
      return res.status(404).json({ message: "Link không tồn tại hoặc đã thay đổi" });
    }

    const deckRow = deckResult.recordset[0];
    const deckId = deckRow.Id;
    const deck = {
      id: deckId,
      title: deckRow.Title,
      description: deckRow.Description || "",
      ownerName: decodeMaybe(deckRow.OwnerUsername),
      jlptLevel: deckRow.JlptLevel || "N5",
      isPublic: !!deckRow.IsPublic,
      isOfficial: !!deckRow.IsOfficial,
      shareToken: deckRow.ShareToken || null,
      createdAt: deckRow.CreatedAt,
    };

    const cardsResult = await pool
      .request()
      .input("DeckId", sql.Int, deckId)
      .query(
        `SELECT Id, DeckId, Front, Back, Example, Learned, Hiragana, ChoicesJson FROM Flashcards WHERE DeckId = @DeckId ORDER BY Id`
      );

    const cards = (cardsResult.recordset || []).map((row) => ({
      id: row.Id,
      deckId: row.DeckId,
      front: row.Front || "",
      back: row.Back || "",
      example: row.Example || "",
      learned: !!row.Learned,
      hiragana: row.Hiragana || "",
      choices: parseChoicesFromRow(row.ChoicesJson),
    }));

    return res.json({ deck, cards, viaShare: true });
  } catch (error) {
    console.error("Error fetching shared deck:", error);
    return res.status(500).json({ message: "Không tải được deck chia sẻ" });
  }
});

// GET /api/flashcards/decks
// - username + mineOnly=1: chỉ deck của user
// - username (không mineOnly): deck của user + deck public (mặc định khi đã đăng nhập)
// - không username: chỉ deck public
router.get("/decks", async (req, res) => {
  const username =
    typeof req.query.username === "string" ? req.query.username : null;
  const mineOnly = req.query.mineOnly === "1" || req.query.mineOnly === "true";

  try {
    await poolConnect;

    let query = `
      SELECT d.Id, d.Title, d.Description, d.OwnerUsername, d.JlptLevel, d.IsPublic, d.CreatedAt,
        d.ShareToken,
        ISNULL(d.IsOfficial, 0) AS IsOfficial,
        (SELECT COUNT(*) FROM Flashcards f WHERE f.DeckId = d.Id) AS CardCount
      FROM Decks d
    `;
    const request = pool.request();

    if (username) {
      request.input("Username", sql.NVarChar(255), username);
      if (mineOnly) {
        query += ` WHERE d.OwnerUsername = @Username`;
      } else {
        query += ` WHERE d.OwnerUsername = @Username OR ISNULL(d.IsPublic, 1) = 1`;
      }
    } else {
      query += ` WHERE ISNULL(d.IsPublic, 1) = 1`;
    }
    query += ` ORDER BY d.CreatedAt DESC`;

    const result = await request.query(query);
    const rows = result.recordset || [];

    const decks = rows.map((row) => ({
      id: row.Id,
      title: row.Title,
      description: row.Description || "",
      ownerName: decodeMaybe(row.OwnerUsername),
      jlptLevel: row.JlptLevel || "N5",
      isPublic: !!row.IsPublic,
      isOfficial: !!row.IsOfficial,
      shareToken: row.ShareToken || null,
      cardCount: row.CardCount ?? row.Cardcount ?? 0,
      createdAt: row.CreatedAt,
    }));

    return res.json(decks);
  } catch (error) {
    console.error("Error fetching decks:", error);
    const msg = error?.message || "Failed to fetch decks";
    return res.status(500).json({ message: msg });
  }
});

// GET /api/flashcards/decks/:id - get deck + cards
router.get("/decks/:id", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;

    const deckResult = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(
        `SELECT Id, Title, Description, OwnerUsername, JlptLevel, IsPublic, CreatedAt, ShareToken, ISNULL(IsOfficial, 0) AS IsOfficial FROM Decks WHERE Id = @Id`
      );

    if (!deckResult.recordset?.length) {
      return res.status(404).json({ message: "Deck not found" });
    }

    const deckRow = deckResult.recordset[0];
    const owner = decodeMaybe(deckRow.OwnerUsername);
    const isPublic = !!deckRow.IsPublic;
    const isAdmin = await checkIsAdmin(requester);
    if (!isPublic && owner !== requester && !isAdmin) {
      return res.status(403).json({ message: "Không xem được deck riêng tư." });
    }

    const deck = {
      id: deckRow.Id,
      title: deckRow.Title,
      description: deckRow.Description || "",
      ownerName: owner,
      jlptLevel: deckRow.JlptLevel || "N5",
      isPublic,
      isOfficial: !!deckRow.IsOfficial,
      shareToken: deckRow.ShareToken || null,
      createdAt: deckRow.CreatedAt,
    };

    const cardsResult = await pool
      .request()
      .input("DeckId", sql.Int, id)
      .query(
        `SELECT Id, DeckId, Front, Back, Example, Learned, Hiragana, ChoicesJson FROM Flashcards WHERE DeckId = @DeckId ORDER BY Id`
      );

    const cards = (cardsResult.recordset || []).map((row) => ({
      id: row.Id,
      deckId: row.DeckId,
      front: row.Front || "",
      back: row.Back || "",
      example: row.Example || "",
      learned: !!row.Learned,
      hiragana: row.Hiragana || "",
      choices: parseChoicesFromRow(row.ChoicesJson),
    }));

    return res.json({ deck, cards });
  } catch (error) {
    console.error("Error fetching deck:", error);
    return res.status(500).json({ message: "Failed to fetch deck" });
  }
});

// POST /api/flashcards/decks - create deck
router.post("/decks", async (req, res) => {
  const { title, description, jlptLevel, isPublic, isOfficial } = req.body;
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!title?.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }

  try {
    await poolConnect;

    const adminUser = await checkIsAdmin(requester);
    const official = adminUser && isOfficial === true ? 1 : 0;

    const result = await pool
      .request()
      .input("Title", sql.NVarChar(255), title.trim())
      .input("Description", sql.NVarChar(500), description?.trim() || null)
      .input("OwnerUsername", sql.NVarChar(255), requester || "")
      .input("JlptLevel", sql.NVarChar(20), jlptLevel || "N5")
      .input("IsPublic", sql.Bit, isPublic !== false ? 1 : 0)
      .input("IsOfficial", sql.Bit, official)
      .query(
        `INSERT INTO Decks (Title, Description, OwnerUsername, JlptLevel, IsPublic, IsOfficial)
         OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Description, INSERTED.OwnerUsername, INSERTED.JlptLevel, INSERTED.IsPublic, INSERTED.CreatedAt, INSERTED.ShareToken, INSERTED.IsOfficial
         VALUES (@Title, @Description, @OwnerUsername, @JlptLevel, @IsPublic, @IsOfficial)`
      );

    const row = result.recordset[0];
    return res.status(201).json({
      id: row.Id,
      title: row.Title,
      description: row.Description || "",
      ownerName: decodeMaybe(row.OwnerUsername),
      jlptLevel: row.JlptLevel || "N5",
      isPublic: !!row.IsPublic,
      isOfficial: !!row.IsOfficial,
      shareToken: row.ShareToken || null,
      cardCount: 0,
      createdAt: row.CreatedAt,
    });
  } catch (error) {
    console.error("Error creating deck:", error);
    const msg = error?.message || "Failed to create deck";
    return res.status(500).json({ message: msg });
  }
});

// PUT /api/flashcards/decks/:id - update deck
router.put("/decks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, jlptLevel, isPublic, isOfficial } = req.body;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;

    const check = await pool
      .request()
      .input("Id", sql.Int, id)
      .query("SELECT OwnerUsername FROM Decks WHERE Id = @Id");

    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Deck not found" });
    }

    const owner = decodeMaybe(check.recordset[0].OwnerUsername);
    if (owner && owner !== requester) {
      return res.status(403).json({ message: "Not allowed to edit this deck" });
    }

    const request = pool
      .request()
      .input("Id", sql.Int, id)
      .input("Title", sql.NVarChar(255), title?.trim() || "")
      .input("Description", sql.NVarChar(500), description?.trim() || null)
      .input("JlptLevel", sql.NVarChar(20), jlptLevel || "N5")
      .input("IsPublic", sql.Bit, isPublic !== false ? 1 : 0);

    const parts = [
      "Title = @Title",
      "Description = @Description",
      "JlptLevel = @JlptLevel",
      "IsPublic = @IsPublic",
    ];

    if (isOfficial !== undefined && (await checkIsAdmin(requester))) {
      request.input("IsOfficial", sql.Bit, isOfficial ? 1 : 0);
      parts.push("IsOfficial = @IsOfficial");
    }

    await request.query(`UPDATE Decks SET ${parts.join(", ")} WHERE Id = @Id`);

    return res.json({ message: "Updated" });
  } catch (error) {
    console.error("Error updating deck:", error);
    return res.status(500).json({ message: "Failed to update deck" });
  }
});

// POST /api/flashcards/decks/:id/share — tạo / trả về token chia sẻ (chủ deck)
router.post("/decks/:id/share", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;

    const check = await pool
      .request()
      .input("Id", sql.Int, id)
      .query("SELECT OwnerUsername, ShareToken FROM Decks WHERE Id = @Id");

    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Deck not found" });
    }

    const owner = decodeMaybe(check.recordset[0].OwnerUsername);
    if (owner && owner !== requester) {
      return res.status(403).json({ message: "Chỉ chủ deck mới tạo link chia sẻ" });
    }

    let token = check.recordset[0].ShareToken;
    if (!token) {
      token = randomBytes(16).toString("hex");
      await pool
        .request()
        .input("Id", sql.Int, id)
        .input("Token", sql.NVarChar(40), token)
        .query("UPDATE Decks SET ShareToken = @Token WHERE Id = @Id");
    }

    return res.json({ shareToken: token });
  } catch (error) {
    console.error("Error creating share link:", error);
    return res.status(500).json({ message: "Không tạo được link" });
  }
});

// DELETE /api/flashcards/decks/:id
router.delete("/decks/:id", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;

    const check = await pool
      .request()
      .input("Id", sql.Int, id)
      .query("SELECT OwnerUsername FROM Decks WHERE Id = @Id");

    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Deck not found" });
    }

    const owner = decodeMaybe(check.recordset[0].OwnerUsername);
    const isAdmin = await checkIsAdmin(requester);
    if (owner && owner !== requester && !isAdmin) {
      return res.status(403).json({ message: "Not allowed to delete this deck" });
    }

    await pool.request().input("Id", sql.Int, id).query("DELETE FROM Flashcards WHERE DeckId = @Id");
    await pool.request().input("Id", sql.Int, id).query("DELETE FROM Decks WHERE Id = @Id");

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting deck:", error);
    return res.status(500).json({ message: "Failed to delete deck" });
  }
});

// POST /api/flashcards/decks/:id/cards - add card
router.post("/decks/:id/cards", async (req, res) => {
  const { id } = req.params;
  const { front, back, example, hiragana, choices } = req.body;
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!front?.trim() || !back?.trim()) {
    return res.status(400).json({ message: "Front and back are required" });
  }

  const choicesArr = Array.isArray(choices)
    ? choices.filter((c) => typeof c === "string" && c.trim())
    : [];
  const choicesJson = choicesArr.length ? JSON.stringify(choicesArr) : null;

  try {
    await poolConnect;

    const check = await pool
      .request()
      .input("Id", sql.Int, id)
      .query("SELECT OwnerUsername FROM Decks WHERE Id = @Id");

    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Deck not found" });
    }

    const owner = decodeMaybe(check.recordset[0].OwnerUsername);
    if (owner && owner !== requester) {
      return res.status(403).json({ message: "Not allowed to add cards" });
    }

    const result = await pool
      .request()
      .input("DeckId", sql.Int, id)
      .input("Front", sql.NVarChar(500), front.trim())
      .input("Back", sql.NVarChar(500), back.trim())
      .input("Example", sql.NVarChar(500), example?.trim() || null)
      .input("Hiragana", sql.NVarChar(500), hiragana?.trim() || null)
      .input("ChoicesJson", sql.NVarChar(4000), choicesJson)
      .query(
        `INSERT INTO Flashcards (DeckId, Front, Back, Example, Learned, Hiragana, ChoicesJson)
         OUTPUT INSERTED.Id, INSERTED.DeckId, INSERTED.Front, INSERTED.Back, INSERTED.Example, INSERTED.Learned, INSERTED.Hiragana, INSERTED.ChoicesJson
         VALUES (@DeckId, @Front, @Back, @Example, 0, @Hiragana, @ChoicesJson)`
      );

    const row = result.recordset[0];
    return res.status(201).json({
      id: row.Id,
      deckId: row.DeckId,
      front: row.Front,
      back: row.Back,
      example: row.Example || "",
      learned: !!row.Learned,
      hiragana: row.Hiragana || "",
      choices: parseChoicesFromRow(row.ChoicesJson),
    });
  } catch (error) {
    console.error("Error adding card:", error);
    return res.status(500).json({ message: "Failed to add card" });
  }
});

// PUT /api/flashcards/cards/:id - update card
router.put("/cards/:id", async (req, res) => {
  const { id } = req.params;
  const { front, back, example, learned, hiragana, choices } = req.body;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;

    const check = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(
        `SELECT f.Id, d.OwnerUsername FROM Flashcards f
         JOIN Decks d ON d.Id = f.DeckId WHERE f.Id = @Id`
      );

    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Card not found" });
    }

    const owner = decodeMaybe(check.recordset[0].OwnerUsername);
    if (owner && owner !== requester) {
      return res.status(403).json({ message: "Not allowed to edit this card" });
    }

    const updates = [];
    const request = pool.request().input("Id", sql.Int, id);

    if (front !== undefined) {
      request.input("Front", sql.NVarChar(500), front?.trim() || "");
      updates.push("Front = @Front");
    }
    if (back !== undefined) {
      request.input("Back", sql.NVarChar(500), back?.trim() || "");
      updates.push("Back = @Back");
    }
    if (example !== undefined) {
      request.input("Example", sql.NVarChar(500), example?.trim() || null);
      updates.push("Example = @Example");
    }
    if (learned !== undefined) {
      request.input("Learned", sql.Bit, !!learned);
      updates.push("Learned = @Learned");
    }
    if (hiragana !== undefined) {
      request.input("Hiragana", sql.NVarChar(500), hiragana?.trim() || null);
      updates.push("Hiragana = @Hiragana");
    }
    if (choices !== undefined) {
      const choicesArr = Array.isArray(choices)
        ? choices.filter((c) => typeof c === "string" && c.trim())
        : [];
      const choicesJson = choicesArr.length ? JSON.stringify(choicesArr) : null;
      request.input("ChoicesJson", sql.NVarChar(4000), choicesJson);
      updates.push("ChoicesJson = @ChoicesJson");
    }

    if (updates.length) {
      await request.query(
        `UPDATE Flashcards SET ${updates.join(", ")} WHERE Id = @Id`
      );
    }

    return res.json({ message: "Updated" });
  } catch (error) {
    console.error("Error updating card:", error);
    return res.status(500).json({ message: "Failed to update card" });
  }
});

// DELETE /api/flashcards/cards/:id
router.delete("/cards/:id", async (req, res) => {
  const { id } = req.params;
  const requester = decodeHeaderUser(req.header("x-user"));

  try {
    await poolConnect;

    const check = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(
        `SELECT f.Id, d.OwnerUsername FROM Flashcards f
         JOIN Decks d ON d.Id = f.DeckId WHERE f.Id = @Id`
      );

    if (!check.recordset?.length) {
      return res.status(404).json({ message: "Card not found" });
    }

    const owner = decodeMaybe(check.recordset[0].OwnerUsername);
    const isAdmin = await checkIsAdmin(requester);
    if (owner && owner !== requester && !isAdmin) {
      return res.status(403).json({ message: "Not allowed to delete this card" });
    }

    await pool.request().input("Id", sql.Int, id).query("DELETE FROM Flashcards WHERE Id = @Id");
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting card:", error);
    return res.status(500).json({ message: "Failed to delete card" });
  }
});

export default router;
