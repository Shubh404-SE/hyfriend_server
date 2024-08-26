// messageController.js
import { query } from "../postgres/db.js";
import fs from "fs";

export const addMessage = async (req, res, next) => {
  try {
    const { message, from, to, replyToMessageId } = req.body;
    const getUser = onlineUsers.get(to); // check for online user

    if (message && from && to) {
      // Get the user information of the message being replied to
      let replyToUserId = null;
      if (replyToMessageId) {
        const replyMessage = await query(
          `SELECT "senderId" FROM "Messages" WHERE id = $1`,
          [replyToMessageId]
        );
        replyToUserId = replyMessage.rows[0]?.senderId || null;
      }

      const queryText = `
        INSERT INTO "Messages" (message, "senderId", "recieverId", type, "messageStatus", "replyToMessageId", "replyToUserId")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const values = [
        message,
        parseInt(from),
        parseInt(to),
        "text",
        getUser ? "delivered" : "sent",
        replyToMessageId ? parseInt(replyToMessageId) : null,
        replyToUserId ? parseInt(replyToUserId) : null,
      ];
      const { rows } = await query(queryText, values);

      return res.status(201).send({ message: rows[0] });
    }
    return res.status(400).send("From, to, and message are required");
  } catch (err) {
    next(err);
  }
};

// Controller to add a reaction to a message
export const addMessageReaction = async (req, res, next) => {
  try {
    const { messageId, userId, reaction } = req.body;

    if (!messageId || !userId || !reaction) {
      return res
        .status(400)
        .json({ error: "messageId, userId, and reaction are required" });
    }

    const insertReactionQuery = `
      INSERT INTO "MessageReactions" ("messageId", "userId", "reaction")
      VALUES ($1, $2, $3)
      ON CONFLICT ("messageId", "userId") 
      DO UPDATE SET "reaction" = EXCLUDED.reaction
      RETURNING *;
    `;
    const values = [messageId, userId, reaction];
    const { rows } = await query(insertReactionQuery, values);

    return res.status(201).json({ reaction: rows[0] });
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.params;

    const queryText = `
      SELECT m.*, 
            r.message AS repliedMessage, 
            COALESCE(
              json_agg(
                CASE 
                  WHEN mr."userId" IS NOT NULL THEN 
                    json_build_object('userId', mr."userId", 'reaction', mr.reaction) 
                  ELSE 
                    NULL 
                END
              ) FILTER (WHERE mr."userId" IS NOT NULL), 
              '[]'::json
            ) AS reactions
      FROM "Messages" m
      LEFT JOIN "Messages" r ON m."replyToMessageId" = r.id
      LEFT JOIN "MessageReactions" mr ON m.id = mr."messageId"
      WHERE (m."senderId" = $1 AND m."recieverId" = $2) OR (m."senderId" = $2 AND m."recieverId" = $1)
      GROUP BY m.id, r.message
      ORDER BY m."createdAt" ASC;
      `;

    const values = [parseInt(from), parseInt(to)];
    const { rows: messages } = await query(queryText, values);

    const unreadMessages = [];

    messages.forEach((message, index) => {
      // get unreadmessages and mark them as read
      if (
        message.messageStatus !== "read" &&
        message.senderId === parseInt(to)
      ) {
        messages[index].messageStatus = "read";
        messages[index].seenAt = new Date();
        unreadMessages.push(message.id);
      }
    });

    if (unreadMessages.length > 0) {
      // set messages seen time here - default it will be null or nothing
      const updateText = `
        UPDATE "Messages"
        SET "messageStatus" = 'read', "seenAt" = NOW()
        WHERE id = ANY($1::int[]);
      `;
      await query(updateText, [unreadMessages]);
    }

    return res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
};

export const addImageMessage = async (req, res, next) => {
  try {
    if (req.file) {
      const date = Date.now();
      let fileName =
        "uploads/images/" + "HyFriend-image-" + date + req.file.originalname; // unique name
      fs.renameSync(req.file.path, fileName);

      const { from, to } = req.query;

      if (from && to) {
        const queryText = `
          INSERT INTO "Messages" (message, "senderId", "recieverId", type)
          VALUES ($1, $2, $3, 'image')
          RETURNING *;
        `;
        const values = [fileName, parseInt(from), parseInt(to)];
        const { rows } = await query(queryText, values);

        return res.status(201).json({ message: rows[0] });
      }
      return res.status(400).send("From and to are required");
    }
    return res.status(400).send("Image is required");
  } catch (err) {
    next(err);
  }
};

export const addAudioMessage = async (req, res, next) => {
  try {
    if (req.file) {
      const date = Date.now();
      let fileName =
        "uploads/recordings/" +
        "HyFriend-audio-" +
        date +
        req.file.originalname;
      fs.renameSync(req.file.path, fileName);

      const { from, to } = req.query;

      if (from && to) {
        const queryText = `
          INSERT INTO "Messages" (message, "senderId", "recieverId", type)
          VALUES ($1, $2, $3, 'audio')
          RETURNING *;
        `;
        const values = [fileName, parseInt(from), parseInt(to)];
        const { rows } = await query(queryText, values);

        return res.status(201).json({ message: rows[0] });
      }
      return res.status(400).send("From and to are required");
    }
    return res.status(400).send("Audio is required");
  } catch (err) {
    next(err);
  }
};

export const getInitialContactsWithMessages = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.from);

    // Fetch the user
    const userResult = await query(
      `
      SELECT * FROM "User" WHERE id = $1
    `,
      [userId]
    );

    const user = userResult.rows[0];

    // Fetch sent and received messages
    const sentMessagesResult = await query(
      `
      SELECT * FROM "Messages" WHERE "senderId" = $1 ORDER BY "createdAt" DESC
    `,
      [userId]
    );

    const receivedMessagesResult = await query(
      `
      SELECT * FROM "Messages" WHERE "recieverId" = $1 ORDER BY "createdAt" DESC
    `,
      [userId]
    );

    const messages = [
      ...sentMessagesResult.rows,
      ...receivedMessagesResult.rows,
    ];
    messages.sort((a, b) => b.createdAt - a.createdAt);

    const users = new Map();
    const messageStatusChange = [];

    for (const msg of messages) {
      const isSender = msg.senderId === userId;
      const calculatedId = isSender ? msg.recieverId : msg.senderId;

      if (msg.messageStatus === "sent") {
        messageStatusChange.push(msg.id);
      }

      if (!users.has(calculatedId)) {
        // if user is not in users then unreadmessages
        const userResult = await query(
          `
          SELECT id, email, name, "profilePicture", about FROM "User" WHERE id = $1
        `,
          [calculatedId]
        );

        const userObj = userResult.rows[0];

        let user = {
          messageId: msg.id,
          type: msg.type,
          message: msg.message,
          messageStatus: msg.messageStatus,
          createdAt: msg.createdAt,
          senderId: msg.senderId,
          recieverId: msg.recieverId,
          totalUnreadMessages: isSender
            ? 0
            : msg.messageStatus !== "read"
            ? 1
            : 0,
          ...userObj,
        };

        users.set(calculatedId, user);
      } else if (msg.messageStatus !== "read" && !isSender) {
        // is user is in  users and not sender then increase unreadmessage count
        const user = users.get(calculatedId);
        users.set(calculatedId, {
          ...user,
          totalUnreadMessages: user.totalUnreadMessages + 1,
        });
      }
    }

    if (messageStatusChange.length) {
      // change all received message status to delivered when user comes to online
      await query(
        `
        UPDATE "Messages" SET "messageStatus" = 'delivered'
        WHERE id = ANY($1::int[])
      `,
        [messageStatusChange]
      );
    }

    console.log("Users Map Size:", users.size); // Debug log
    res.status(200).json({
      users: Array.from(users.values()),
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  } catch (err) {
    next(err);
  }
};

// Controller to handle deleting a message
export const deleteMessage = async (req, res) => {
  const { messageId, userId, type } = req.body;

  try {
    const { rows } = await query(`SELECT * FROM "Messages" WHERE id = $1`, [
      messageId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    const message = rows[0];

    const timeElapsed = new Date() - new Date(message.createdAt);

    // Convert time to hours
    const hoursElapsed = timeElapsed / (1000 * 60 * 60);

    if (type === "DELETED_FOR_EVERYONE") {
      if (message.senderId !== userId) {
        return res.status(201).json({
          error: "Only the sender can delete the message for everyone.",
        });
      }
      if (hoursElapsed > 24) {
        return res.status(201).json({
          error: "Message can only be deleted for everyone within 24 hours.",
        });
      }

      await query(
        `UPDATE "Messages" SET "isDeletedForEveryone" = TRUE WHERE id = $1`,
        [messageId]
      );

      return res.status(200).json({ message: "Message deleted for everyone." });
    } else if (type === "DELETED_FOR_ME") {
      const updatedDeletedForUsers = [...message.deletedForUsers, userId];

      await query(
        `UPDATE "Messages" SET "deletedForUsers" = $1 WHERE id = $2`,
        [JSON.stringify(updatedDeletedForUsers), messageId]
      );

      return res.status(200).json({ message: "Message deleted for you." });
    }

    return res.status(400).json({ error: "Invalid delete type specified." });
  } catch (err) {
    console.error("Error deleting message:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};
