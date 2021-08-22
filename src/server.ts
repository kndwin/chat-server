import express from "express";
import http from "http";
import { v4 } from "uuid";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3001;
const app = express();
const server = http.createServer(app);
let rooms: any = [];
let connectedUsers: any = [];

app.get("/api/room-exist/:roomId", (req, res) => {
  const { roomId } = req.params;
  console.log({ roomId });
  const room = rooms.find((room: any) => room.id === roomId);
  console.log(room.connectedUsers);
  res.header("Access-Control-Allow-Origin", "*");
  if (room) {
    if (room.connectedUsers.length > 3) {
      return res.send({ roomExist: true, full: true });
    } else {
      return res.send({ roomExist: true, full: false });
    }
  } else {
    return res.send({ roomExist: false });
  }
});

app.use(cors({ credentials: true, origin: true }));

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connect", (socket) => {
  console.log(`connected on ${socket.id}`);

  socket.on("create-new-room", (data: any) => {
    createNewRoom(data, socket);
  });

  socket.on("join-room", (data: any) => {
    joinRoom(data, socket);
  });

  socket.on("disconnect", () => {
    disconnect(socket);
  });
  socket.on("conn-signal", (data: any) => {
    signaling(data, socket);
  });

  socket.on("conn-init", (data: any) => {
    initializeConnetion(data, socket);
  });
});

// socket.io stuff

const joinRoom = (data: any, socket: any) => {
  const { name, roomId } = data;
  const newUser = {
    name,
    id: v4(),
    socketId: socket.id,
    roomId,
  };

  const room = rooms.find((room: any) => room.id === roomId);
  room.connectedUsers = [...room.connectedUsers, newUser];
  socket.join(roomId);
  connectedUsers = [...connectedUsers, newUser];
  room.connectedUsers.forEach((user: any) => {
    if (user.socketId !== socket.id) {
      const data = {
        connUserSocketId: socket.id,
      };
      io.to(user.socketId).emit("conn-prepare", data);
    }
  });
  io.to(roomId).emit("room-update", { connectedUsers: room.connectedUsers });
};

const createNewRoom = (data: any, socket: any) => {
  // console.log({ data, socket });
  const { name } = data;
  const roomId = v4();
  // console.log({ roomId });
  const newUser = {
    name,
    id: v4(),
    socketId: socket.id,
    roomId,
  };
  connectedUsers = [...connectedUsers, newUser];

  const newRoom = {
    id: roomId,
    connectedUsers: [newUser],
  };

  socket.join(roomId);
  rooms = [...rooms, newRoom];
  socket.emit("room-id", { roomId });
  socket.emit("room-update", { connectedUsers: newRoom.connectedUsers });
};

const disconnect = (socket: any) => {
  const user = connectedUsers.find((user: any) => user.socketId === socket.id);
  if (user) {
    const room = rooms.find((room: any) => room.id === user.roomId);
    room.connectedUsers = room?.connectedUsers?.filter(
      (user: any) => user.socketId !== socket.id
    );
    socket.leave(user.roomId);
    if (room.connectedUsers.length > 0) {
      io.to(room.id).emit("user-disconnected", { socketId: socket.id });
      io.to(room.id).emit("room-update", {
        connectedUsers: room.connectedUsers,
      });
    } else {
      rooms = rooms?.filter(
        (roomFromRooms: any) => roomFromRooms.id !== room.id
      );
    }
  }
};

const signaling = (data: any, socket: any) => {
  const { connUserSocketId, signal } = data;
  const signalingData = { signal, connUserSocketId: socket.id };
  io.to(connUserSocketId).emit("conn-signal", signalingData);
};

const initializeConnetion = (data: any, socket: any) => {
  const { connUserSocketId } = data;
  const initData = { connUserSocketId: socket.id };
  io.to(connUserSocketId).emit("conn-init", initData);
};

server.listen(PORT, () => console.log(`🚀 listening on *:${PORT}`));
