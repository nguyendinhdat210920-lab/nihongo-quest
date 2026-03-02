import dotenv from "dotenv";
dotenv.config();

const usePostgres = !!process.env.DATABASE_URL;

const mod = usePostgres
  ? await import("./db-pg.js")
  : await import("./db-mssql.js");

export const { sql, pool, poolConnect, usePostgres } = mod;
