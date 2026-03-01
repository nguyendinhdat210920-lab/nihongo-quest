import express from "express";
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

// GET /api/flashcards/decks - list decks (username = filter "my decks")
router.get("/decks", async (req, res) => {
  const username =
    typeof req.query.username === "string" ? req.query.username : null;

  try {
    await poolConnect;

    let query = `
      SELECT d.Id, d.Title, d.Description, d.OwnerUsername, d.JlptLevel, d.IsPublic, d.CreatedAt,
        (SELECT COUNT(*) FROM Flashcards f WHERE f.DeckId = d.Id) AS CardCount
      FROM Decks d
    `;
    const request = pool.request();

    if (username) {
      request.input("Username", sql.NVarChar(255), username);
      query += ` WHERE d.OwnerUsername = @Username OR ISNULL(d.IsPublic, 1) = 1`;
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

  try {
    await poolConnect;

    const deckResult = await pool
      .request()
      .input("Id", sql.Int, id)
      .query(
        `SELECT Id, Title, Description, OwnerUsername, JlptLevel, IsPublic, CreatedAt FROM Decks WHERE Id = @Id`
      );

    if (!deckResult.recordset?.length) {
      return res.status(404).json({ message: "Deck not found" });
    }

    const deckRow = deckResult.recordset[0];
    const deck = {
      id: deckRow.Id,
      title: deckRow.Title,
      description: deckRow.Description || "",
      ownerName: decodeMaybe(deckRow.OwnerUsername),
      jlptLevel: deckRow.JlptLevel || "N5",
      isPublic: !!deckRow.IsPublic,
      createdAt: deckRow.CreatedAt,
    };

    const cardsResult = await pool
      .request()
      .input("DeckId", sql.Int, id)
      .query(
        `SELECT Id, DeckId, Front, Back, Example, Learned FROM Flashcards WHERE DeckId = @DeckId ORDER BY Id`
      );

    const cards = (cardsResult.recordset || []).map((row) => ({
      id: row.Id,
      deckId: row.DeckId,
      front: row.Front || "",
      back: row.Back || "",
      example: row.Example || "",
      learned: !!row.Learned,
    }));

    return res.json({ deck, cards });
  } catch (error) {
    console.error("Error fetching deck:", error);
    return res.status(500).json({ message: "Failed to fetch deck" });
  }
});

// POST /api/flashcards/decks - create deck
router.post("/decks", async (req, res) => {
  const { title, description, jlptLevel, isPublic } = req.body;
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!title?.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }

  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("Title", sql.NVarChar(255), title.trim())
      .input("Description", sql.NVarChar(500), description?.trim() || null)
      .input("OwnerUsername", sql.NVarChar(255), requester || "")
      .input("JlptLevel", sql.NVarChar(20), jlptLevel || "N5")
      .input("IsPublic", sql.Bit, isPublic !== false ? 1 : 0)
      .query(
        `INSERT INTO Decks (Title, Description, OwnerUsername, JlptLevel, IsPublic)
         OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Description, INSERTED.OwnerUsername, INSERTED.JlptLevel, INSERTED.IsPublic, INSERTED.CreatedAt
         VALUES (@Title, @Description, @OwnerUsername, @JlptLevel, @IsPublic)`
      );

    const row = result.recordset[0];
    return res.status(201).json({
      id: row.Id,
      title: row.Title,
      description: row.Description || "",
      ownerName: decodeMaybe(row.OwnerUsername),
      jlptLevel: row.JlptLevel || "N5",
      isPublic: !!row.IsPublic,
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
  const { title, description, jlptLevel, isPublic } = req.body;
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

    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Title", sql.NVarChar(255), title?.trim() || "")
      .input("Description", sql.NVarChar(500), description?.trim() || null)
      .input("JlptLevel", sql.NVarChar(20), jlptLevel || "N5")
      .input("IsPublic", sql.Bit, isPublic !== false ? 1 : 0)
      .query(
        `UPDATE Decks SET Title = @Title, Description = @Description, JlptLevel = @JlptLevel, IsPublic = @IsPublic WHERE Id = @Id`
      );

    return res.json({ message: "Updated" });
  } catch (error) {
    console.error("Error updating deck:", error);
    return res.status(500).json({ message: "Failed to update deck" });
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
    if (owner && owner !== requester) {
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
  const { front, back, example } = req.body;
  const requester = decodeHeaderUser(req.header("x-user"));

  if (!front?.trim() || !back?.trim()) {
    return res.status(400).json({ message: "Front and back are required" });
  }

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
      .query(
        `INSERT INTO Flashcards (DeckId, Front, Back, Example, Learned)
         OUTPUT INSERTED.Id, INSERTED.DeckId, INSERTED.Front, INSERTED.Back, INSERTED.Example, INSERTED.Learned
         VALUES (@DeckId, @Front, @Back, @Example, 0)`
      );

    const row = result.recordset[0];
    return res.status(201).json({
      id: row.Id,
      deckId: row.DeckId,
      front: row.Front,
      back: row.Back,
      example: row.Example || "",
      learned: !!row.Learned,
    });
  } catch (error) {
    console.error("Error adding card:", error);
    return res.status(500).json({ message: "Failed to add card" });
  }
});

// PUT /api/flashcards/cards/:id - update card
router.put("/cards/:id", async (req, res) => {
  const { id } = req.params;
  const { front, back, example, learned } = req.body;
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
      request.input("Learned", sql.Bit, learned ? 1 : 0);
      updates.push("Learned = @Learned");
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
    if (owner && owner !== requester) {
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
