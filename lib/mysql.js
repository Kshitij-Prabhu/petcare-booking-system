// MySQL connection pool helper.
// Credentials come from environment variables only (never hard-coded).
import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });
  }
  return pool;
}

// Simple query helper
export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

// Call a stored procedure that has OUT params, e.g. sp_create_booking.
// Returns the OUT param values.
export async function callProcedureWithOut(callSql, inParams, outVarNames) {
  const conn = await getPool().getConnection();
  try {
    await conn.query(callSql, inParams);
    const selectSql = `SELECT ${outVarNames.map((v) => `@${v} AS ${v}`).join(', ')}`;
    const [rows] = await conn.query(selectSql);
    return rows[0];
  } finally {
    conn.release();
  }
}
