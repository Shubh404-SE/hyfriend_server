// db.js
import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: "postgresql://postgres:postgres@localhost:5432/chatapp", // database url in local
});

export const query = (text, params) => pool.query(text, params);
