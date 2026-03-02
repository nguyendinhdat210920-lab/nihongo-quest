import pg from "pg";

const dbUrl = process.env.DATABASE_URL || "";
const useSsl = dbUrl.includes("supabase") || dbUrl.includes("pooler.supabase");
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

// Chuyển snake_case -> PascalCase để tương thích code SQL Server
const toRecordset = (rows) =>
  rows.map((row) => {
    const r = {};
    for (const [k, v] of Object.entries(row)) {
      const key = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      r[key.charAt(0).toUpperCase() + key.slice(1)] = v;
    }
    return r;
  });

const toSnakeCase = (s) => s.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");

const TABLE_MAP = {
  Users: "users",
  Lessons: "lessons",
  Materials: "materials",
  Quizzes: "quizzes",
  QuizQuestions: "quiz_questions",
  QuizResults: "quiz_results",
  Decks: "decks",
  Flashcards: "flashcards",
  ForumPosts: "forum_posts",
  ForumComments: "forum_comments",
  ForumLikes: "forum_likes",
  ChatMessages: "chat_messages",
  PasswordResetTokens: "password_reset_tokens",
  LessonShares: "lesson_shares",
  QuizShares: "quiz_shares",
  LessonShareTokens: "lesson_share_tokens",
  QuizShareTokens: "quiz_share_tokens",
};

const pgSql = (sql) => {
  let returnCols = [];
  let s = sql
    .replace(/OUTPUT\s+INSERTED\.\*/gi, () => {
      returnCols = ["*"];
      return "";
    })
    .replace(/OUTPUT\s+INSERTED\.(\w+)(?:,\s*INSERTED\.(\w+))*/gi, (m) => {
      returnCols = [...m.matchAll(/INSERTED\.(\w+)/gi)].map((x) => toSnakeCase(x[1]));
      return "";
    })
    .replace(/\bISNULL\s*\(\s*IsBanned\s*,\s*0\s*\)\s*=\s*0\b/gi, "(NOT COALESCE(is_banned, false))")
    .replace(/\bISNULL\s*\(\s*IsPublic\s*,\s*1\s*\)\s*=\s*1\b/gi, "(COALESCE(is_public, true))")
    .replace(/\bISNULL\s*\(\s*d\.IsPublic\s*,\s*1\s*\)\s*=\s*1\b/gi, "(COALESCE(d.is_public, true))")
    .replace(/\bISNULL\s*\(\s*IsAdmin\s*,\s*0\s*\)/gi, "COALESCE(is_admin, false)")
    .replace(/\bISNULL\s*\(\s*u\.IsAdmin\s*,\s*0\s*\)/gi, "COALESCE(u.is_admin, false)")
    .replace(/\bISNULL\s*\(\s*IsBanned\s*,\s*0\s*\)/gi, "COALESCE(is_banned, false)")
    .replace(/\bISNULL\s*\(\s*IsPublic\s*,\s*1\s*\)/gi, "COALESCE(is_public, true)")
    .replace(/\bISNULL\s*\(\s*d\.IsPublic\s*,\s*1\s*\)/gi, "COALESCE(d.is_public, true)")
    .replace(/\bISNULL\s*\(/gi, "COALESCE(")
    .replace(/\bN'/g, "'")
    .replace(/\bLTRIM\s*\(\s*RTRIM\s*\(\s*([^)]+)\s*\)\s*\)/gi, "TRIM($1)")
    .replace(/INSERT INTO [Ff]lashcards[\s\S]*?VALUES\s*\([^)]+,\s*0\s*\)/gi, (m) => m.replace(/,\s*0\s*\)\s*$/, ", false)"))
    .replace(/INSERT INTO [Uu]sers[\s\S]*?VALUES\s*\([^)]+,\s*0\s*\)/gi, (m) => m.replace(/,\s*0\s*\)\s*$/, ", false)"))
    .replace(/\bSELECT\s+TOP\s+(\d+)\s+/gi, (_, n) => `SELECT `)
    .replace(/(\s+ORDER\s+BY\s+[^;]+?)(\s*)(;?\s*)$/gim, (m, orderBy, sp, end) => {
      const topMatch = sql.match(/\bSELECT\s+TOP\s+(\d+)\s+/i);
      return topMatch ? `${orderBy} LIMIT ${topMatch[1]}${sp}${end}` : m;
    })
    .replace(/\bGETUTCDATE\s*\(\s*\)/gi, "(NOW() AT TIME ZONE 'UTC')")
    .replace(/\bGETDATE\s*\(\s*\)/gi, "NOW()")
    .replace(/\bCAST\s*\(\s*(\w+)\s+AS\s+DATE\s*\)/gi, "($1::date)")
    .replace(/\bDATEPART\s*\(\s*WEEKDAY\s*,\s*(\w+)\s*\)/gi, "EXTRACT(DOW FROM $1)::int + 1")
    .replace(/\bMONTH\s*\(\s*(\w+)\s*\)/gi, "EXTRACT(MONTH FROM $1)::int")
    .replace(/\bYEAR\s*\(\s*(\w+)\s*\)/gi, "EXTRACT(YEAR FROM $1)::int")
    .replace(/\bDATEADD\s*\(\s*day\s*,\s*-(\d+)\s*,\s*(?:GETDATE\s*\(\s*\)|NOW\s*\(\s*\))\s*\)/gi, "(NOW() - INTERVAL '$1 days')")
    .replace(/\bDATEADD\s*\(\s*month\s*,\s*-(\d+)\s*,\s*(?:GETDATE\s*\(\s*\)|NOW\s*\(\s*\))\s*\)/gi, "(NOW() - INTERVAL '$1 months')")
    .replace(/\bOFFSET\s+(\d+)\s+ROWS\s+FETCH\s+NEXT\s+(\d+)\s+ROWS\s+ONLY\b/gi, "OFFSET $1 LIMIT $2")
    .replace(/\s+ROWS\s+FETCH\s+NEXT\s+/gi, " LIMIT ")
    .replace(/\s+ROWS\s+ONLY\b/gi, "");
  for (const [k, v] of Object.entries(TABLE_MAP)) {
    s = s.replace(new RegExp(`\\b${k}\\b`, "g"), v);
  }
  s = s.replace(/\b(Id|Username|Email|PasswordHash|IsBanned|IsAdmin|CreatedAt|Title|Content|CreatedBy|AttachmentUrl|AttachmentType|Status|IsPublic|Course|Tags|FileUrl|FileType|UploaderName|Description|CreatorName|QuestionCount|QuizId|QuestionText|OptionA|OptionB|OptionC|OptionD|CorrectOption|Score|TotalQuestions|OwnerUsername|JlptLevel|Front|Back|Example|Learned|AuthorUsername|PostId|Message|Token|ExpiresAt|DeckId|FileName|LessonId|SharedWithUsername)\b/g, (m) => toSnakeCase(m));

  if (returnCols.length) {
    s = s.replace(/(\))(\s*;?\s*)$/, `$1 RETURNING ${returnCols.join(", ")}$2`);
  }
  return s;
};

class PgRequest {
  constructor() {
    this.params = [];
    this.paramMap = {};
  }
  input(name, _type, value) {
    this.paramMap[name] = this.params.length;
    this.params.push(value);
    return this;
  }
  async query(sql) {
    const paramOrder = [];
    let newSql = sql.replace(/@(\w+)/g, (match, pName) => {
      if (this.paramMap[pName] === undefined) return match;
      paramOrder.push(this.paramMap[pName]);
      return `$${paramOrder.length}`;
    });
    newSql = pgSql(newSql);
    const orderedParams = paramOrder.map((i) => this.params[i]);
    const result = await pool.query(newSql, orderedParams);
    return { recordset: toRecordset(result.rows) };
  }
}

const poolConnect = pool.query("SELECT 1").then(() => {});

const sql = {
  NVarChar: () => {},
  NChar: () => {},
  Int: () => {},
  Bit: () => {},
  DateTime2: () => {},
  MAX: 2147483647,
};

pool.request = () => new PgRequest();

const usePostgres = true;
export { sql, pool, poolConnect, usePostgres };
