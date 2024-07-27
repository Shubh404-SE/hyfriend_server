import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import AuthRoutes from "./routes/AuthRoutes.js";
import MessageRoutes from "./routes/MessageRoutes.js";
import { Server } from "socket.io";
import {createTables} from "./postgres/createTable.js"
dotenv.config();
const app = express();

// console.log(process.env.CLIENT_URL);

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL);
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, application/json, text/plain, */*, *");
//   next();
// });

// app.use(cors({
//   origin: [process.env.CLIENT_URL, "http://localhost:3000"], // Ensure this is the correct URL
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization", "application/json", "text/plain", "*/*", "*"],
// }));
// app.options('*', cors()); // Handle preflight requests
app.use(express.json());
app.use(cors());

app.use("/uploads/recordings", express.static("uploads/recordings"));
app.use("/uploads/images", express.static("uploads/images"));

app.use("/api/auth", AuthRoutes);
app.use("/api/messages", MessageRoutes);


const createTable = async () => {
  try {
    await createTables();
  } catch (err) {
    console.error('Error initializing server', err);
    process.exit(1);
  }
};

createTable();
const server = app.listen(process.env.PORT, () => {
  console.log(`server started at port ${process.env.PORT}`);
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
    socket.broadcast.emit("online-users", {
      onlineUsers:Array.from(onlineUsers.keys),
    });
  });

  socket.on("signout", (id)=>{
    onlineUsers.delete(id);
    socket.broadcast.emit("online-users", {
      onlineUsers:Array.from(onlineUsers.keys),
    });
  })

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", {
        from: data.from,
        to:data.to,
        message: data.message,
      });
    }
  });

  socket.on("outgoing-voice-call", (data)=>{
    const sendUserSocket = onlineUsers.get(data.to);
    if(sendUserSocket){
      socket.to(sendUserSocket).emit("incoming-voice-call", {
        from:data.from,
        roomId: data.roomId,
        callType:data.callType, 
      });
    }
  });

  socket.on("outgoing-video-call", (data)=>{
    const sendUserSocket = onlineUsers.get(data.to);
    
    if(sendUserSocket){
      socket.to(sendUserSocket).emit("incoming-video-call", {
        from:data.from,
        roomId: data.roomId,
        callType:data.callType, 
      });
    }
  });


  socket.on("reject-voice-call", (data)=>{
    const sendUserSocket = onlineUsers.get(data.from);
    if(sendUserSocket){
      socket.to(sendUserSocket).emit("voice-call-rejected");
    }
  });

  socket.on("reject-video-call", (data)=>{
    const sendUserSocket = onlineUsers.get(data.from);
    if(sendUserSocket){
      socket.to(sendUserSocket).emit("video-call-rejected");
    }
  });

  socket.on("accept-incoming-call", ({id})=>{
    const sendUserSocket = onlineUsers.get(id);
    socket.to(sendUserSocket).emit("accept-call");
  });

});
