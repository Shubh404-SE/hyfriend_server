// createSchema.js
import { pool } from "./db.js";

export const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      "profilePicture" VARCHAR(255) DEFAULT '',
      about TEXT DEFAULT ''
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Messages" (
      id SERIAL PRIMARY KEY,
      "senderId" INT NOT NULL,
      "recieverId" INT NOT NULL,
      type VARCHAR(50) DEFAULT 'text',
      message TEXT NOT NULL,
      "messageStatus" VARCHAR(50) DEFAULT 'sent',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sender
        FOREIGN KEY("senderId") 
          REFERENCES "User"(id),
      CONSTRAINT fk_reciever
        FOREIGN KEY("recieverId") 
          REFERENCES "User"(id)
    );
    `);

    console.log("Tables created successfully (if they didn't already exist)!");
  } catch (err) {
    console.error("Error creating tables", err);
  } finally {
    client.release();
  }
};
