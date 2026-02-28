import mssql from "mssql";

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { trustServerCertificate: true },
};

const pool = new mssql.ConnectionPool(config);
const poolConnect = pool.connect();

export { sql: mssql, pool, poolConnect };
