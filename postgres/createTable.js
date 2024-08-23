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
      "profilePicture" VARCHAR(255) DEFAULT '/default_avatar.png',
      about TEXT DEFAULT '',
      onboard BOOLEAN DEFAULT FALSE
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Messages" (
      id SERIAL PRIMARY KEY,
      "senderId" INTEGER REFERENCES "User"(id) ON DELETE CASCADE,
      "recieverId" INTEGER REFERENCES "User"(id) ON DELETE CASCADE,
      type VARCHAR(50) DEFAULT 'text',
      message TEXT NOT NULL,
      "messageStatus" VARCHAR(50) DEFAULT 'sent',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "seenAt" TIMESTAMP DEFAULT NULL,
      "replyToMessageId" INTEGER REFERENCES "Messages"(id) ON DELETE SET NULL DEFAULT NULL,
      "replyToUserId" INTEGER REFERENCES "User"(id) ON DELETE SET NULL DEFAULT NULL,
      "isDeletedForEveryone" BOOLEAN DEFAULT FALSE,
      "deletedForUsers" JSONB DEFAULT '[]'
    );
    `);

    await client.query(`
    CREATE TABLE IF NOT EXISTS "MessageReactions" (
    id SERIAL PRIMARY KEY,
    "messageId" INTEGER REFERENCES "Messages"(id) ON DELETE CASCADE,
    "userId" INTEGER REFERENCES "User"(id) ON DELETE CASCADE,
    reaction VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("messageId", "userId")
    );
      `);

    console.log("Tables created successfully (if they didn't already exist)!");
  } catch (err) {
    console.error("Error creating tables", err);
  } finally {
    client.release();
  }
};
