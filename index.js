import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import AuthRoutes from "./routes/AuthRoutes.js";
import MessageRoutes from "./routes/MessageRoutes.js";
import { Server } from "socket.io";
import { createTables } from "./postgres/createTable.js";
import { query } from "./postgres/db.js";

dotenv.config();
const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions), (req, res) => {
  res.sendStatus(204);
});

app.use(express.json());

app.use("/uploads/recordings", express.static("uploads/recordings"));
app.use("/uploads/images", express.static("uploads/images"));

app.use("/api/auth", AuthRoutes);
app.use("/api/messages", MessageRoutes);

const createTable = async () => {
  try {
    await createTables();
  } catch (err) {
    console.error("Error initializing server", err);
    process.exit(1);
  }
};

createTable();

const server = app.listen(process.env.PORT, () => {
  console.log(`Server started at port ${process.env.PORT}`);
});

const io = new Server(server, {
  // from chat gpt
  pingInterval: 25000, // How often to ping the client to keep the connection alive
  pingTimeout: 60000, // How long the server will wait for a ping response before considering the client disconnected
  cors: {
    origin: process.env.CLIENT_URL,
  },
});

global.onlineUsers = new Map();
const activeChats = new Map();

// Function to mark a specific message as read in the database
async function markMessageAsRead({ messageId }) {
 
    try {
      await query(
        `
        UPDATE "Messages" 
        SET "messageStatus" = 'read', "seenAt" = NOW()
        WHERE id = $1 AND "messageStatus" != 'read'
      `,
        [messageId]
      );

      console.log(`Marked message ${messageId} as read`);
    } catch (err) {
      console.error("Error updating message status:", err);
    }
}

io.on("connection", (socket) => {
  global.chatSocket = socket;
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User added: ${userId} with socket ID: ${socket.id}`);
    socket.broadcast.emit("online-users", {
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  });

  // Track which chat a user is viewing
  socket.on("active-chat", ({ userId, contactId }) => {
    activeChats.set(userId, contactId);
    updateChatStatus(userId, contactId);
  });

  socket.on("signout", (id) => {
    onlineUsers.delete(id);
    socket.broadcast.emit("online-users", {
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  });

  socket.on("send-msg", async (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    // console.log(sendUserSocket, otherSocket);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", {
        from: data.from,
        to: data.to,
        message: data.message,
      });

      if (activeChats.get(data.to) === data.from) {
        // Update the database to mark messages as read
        await markMessageAsRead({ messageId: data.message.id });
      }
    }
  });

  socket.on("send-react-message", async (data) => {
    const sendUserSocket = onlineUsers.get(data.contactId);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("react-msg-recieve", data.newReaction);
    }
  });

  // socket when user click on contactuser...
  socket.on("mark-messages-read", ({ userId, contactId }) => {
    const contactSocket = onlineUsers.get(contactId);

    socket.to(contactSocket).emit("msg-status-update", {
      userId,
      contactId,
    });
  });

  // When a user changes the chat (e.g., selects a different chat)
  socket.on("change-chat", ({ userId, previousContactId, newContactId }) => {
    // Update the active chat for the user
    activeChats.set(userId, newContactId);

    // Update the chat status for the previous chat user
    if (previousContactId) {
      updateChatStatus(userId, previousContactId);
    }

    // Update the chat status for the new chat user
    updateChatStatus(userId, newContactId);
  });

  // Function to update the chat status for both users
  function updateChatStatus(userId, contactId) {
    const contactActiveChat = activeChats.get(contactId);

    // Check if both users are viewing each other's chat
    const areBothUsersOnSameChat =
      contactActiveChat === userId && activeChats.get(userId) === contactId;

    // Notify both users about the status
    io.to(onlineUsers.get(userId)).emit("is-on-same-chat", {
      status: areBothUsersOnSameChat,
    });
    if (onlineUsers.get(contactId)) {
      io.to(onlineUsers.get(contactId)).emit("is-on-same-chat", {
        status: areBothUsersOnSameChat,
      });
    }
  }

  socket.on("startTyping", ({ to, from }) => {
    const sendUserSocket = onlineUsers.get(to);
    socket.to(sendUserSocket).emit("typing", {
      from,
      to,
    });
  });

  socket.on("stopTyping", ({ to, from }) => {
    const sendUserSocket = onlineUsers.get(to);
    socket.to(sendUserSocket).emit("noTyping", {
      from,
      to,
    });
  });

  socket.on("outgoing-voice-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("incoming-voice-call", {
        from: data.from,
        roomId: data.roomId,
        callType: data.callType,
      });
    }
  });

  socket.on("outgoing-video-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("incoming-video-call", {
        from: data.from,
        roomId: data.roomId,
        callType: data.callType,
      });
    }
  });

  socket.on("reject-voice-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.from);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("voice-call-rejected");
    }
  });

  socket.on("reject-video-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.from);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("video-call-rejected");
    }
  });

  socket.on("accept-incoming-call", ({ id }) => {
    const sendUserSocket = onlineUsers.get(id);
    socket.to(sendUserSocket).emit("accept-call");
  });

  // Cleanup when user disconnects
  socket.on("disconnect", () => {
    let disconnectedUserId = null;
    for (let [userId, socketId] of onlineUsers) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      console.log(`User disconnected: ${disconnectedUserId}`);
      socket.broadcast.emit("online-users", {
        onlineUsers: Array.from(onlineUsers.keys()),
      });
    }
  });
});
