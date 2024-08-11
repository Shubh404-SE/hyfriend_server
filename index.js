import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import AuthRoutes from "./routes/AuthRoutes.js";
import MessageRoutes from "./routes/MessageRoutes.js";
import { Server } from "socket.io";
import { createTables } from "./postgres/createTable.js";

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
  cors: {
    origin: process.env.CLIENT_URL,
  },
});

global.onlineUsers = new Map();

io.on("connection", (socket) => {
  global.chatSocket = socket;
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User added: ${userId} with socket ID: ${socket.id}`);
    socket.broadcast.emit("online-users", {
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  });

  socket.on("signout", (id) => {
    onlineUsers.delete(id);
    socket.broadcast.emit("online-users", {
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    const otherSocket = onlineUsers.get(data.from);
    console.log(sendUserSocket, otherSocket);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", {
        from: data.from,
        to: data.to,
        message: data.message,
      });
    }
    // Emit the contact list update to both sender and receiver
    if (sendUserSocket) {
      io.to(sendUserSocket).emit("update-contact-list");
    }
    if (otherSocket){
      io.to(otherSocket).emit("update-contact-list");
    }
  });

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
    for (let [userId, socketId] of onlineUsers) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User disconnected: ${userId}`);
        socket.broadcast.emit("online-users", {
          onlineUsers: Array.from(onlineUsers.keys()),
        });
        break;
      }
    }
  });
});
