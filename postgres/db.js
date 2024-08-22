// db.js
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

export const pool = new Pool({
  // connectionString: "postgresql://postgres:postgres@localhost:5432/chatapp", // database url in local
  connectionString: process.env.DATABASE_URL, // database url in vercel
});

export const query = (text, params) => pool.query(text, params);
