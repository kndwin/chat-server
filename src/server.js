"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var http_1 = __importDefault(require("http"));
var uuid_1 = require("uuid");
var socket_io_1 = require("socket.io");
var cors_1 = __importDefault(require("cors"));
var PORT = process.env.PORT || 3001;
var app = express_1.default();
var server = http_1.default.createServer(app);
var rooms = [];
var connectedUsers = [];
app.get("/api/room-exist/:roomId", function (req, res) {
    var roomId = req.params.roomId;
    console.log({ roomId: roomId });
    var room = rooms.find(function (room) { return room.id === roomId; });
    console.log(room.connectedUsers);
    res.header("Access-Control-Allow-Origin", "*");
    if (room) {
        if (room.connectedUsers.length > 3) {
            return res.send({ roomExist: true, full: true });
        }
        else {
            return res.send({ roomExist: true, full: false });
        }
    }
    else {
        return res.send({ roomExist: false });
    }
});
app.use(cors_1.default({ credentials: true, origin: true }));
var io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
io.on("connect", function (socket) {
    console.log("connected on " + socket.id);
    socket.on("create-new-room", function (data) {
        createNewRoom(data, socket);
    });
    socket.on("join-room", function (data) {
        joinRoom(data, socket);
    });
    socket.on("disconnect", function () {
        disconnect(socket);
    });
    socket.on("conn-signal", function (data) {
        signaling(data, socket);
    });
    socket.on("conn-init", function (data) {
        initializeConnetion(data, socket);
    });
});
// socket.io stuff
var joinRoom = function (data, socket) {
    var name = data.name, roomId = data.roomId;
    var newUser = {
        name: name,
        id: uuid_1.v4(),
        socketId: socket.id,
        roomId: roomId,
    };
    var room = rooms.find(function (room) { return room.id === roomId; });
    room.connectedUsers = __spreadArray(__spreadArray([], room.connectedUsers), [newUser]);
    socket.join(roomId);
    connectedUsers = __spreadArray(__spreadArray([], connectedUsers), [newUser]);
    room.connectedUsers.forEach(function (user) {
        if (user.socketId !== socket.id) {
            var data_1 = {
                connUserSocketId: socket.id,
            };
            io.to(user.socketId).emit("conn-prepare", data_1);
        }
    });
    io.to(roomId).emit("room-update", { connectedUsers: room.connectedUsers });
};
var createNewRoom = function (data, socket) {
    // console.log({ data, socket });
    var name = data.name;
    var roomId = uuid_1.v4();
    // console.log({ roomId });
    var newUser = {
        name: name,
        id: uuid_1.v4(),
        socketId: socket.id,
        roomId: roomId,
    };
    connectedUsers = __spreadArray(__spreadArray([], connectedUsers), [newUser]);
    var newRoom = {
        id: roomId,
        connectedUsers: [newUser],
    };
    socket.join(roomId);
    rooms = __spreadArray(__spreadArray([], rooms), [newRoom]);
    socket.emit("room-id", { roomId: roomId });
    socket.emit("room-update", { connectedUsers: newRoom.connectedUsers });
};
var disconnect = function (socket) {
    var _a;
    var user = connectedUsers.find(function (user) { return user.socketId === socket.id; });
    if (user) {
        var room_1 = rooms.find(function (room) { return room.id === user.roomId; });
        room_1.connectedUsers = (_a = room_1 === null || room_1 === void 0 ? void 0 : room_1.connectedUsers) === null || _a === void 0 ? void 0 : _a.filter(function (user) { return user.socketId !== socket.id; });
        socket.leave(user.roomId);
        if (room_1.connectedUsers.length > 0) {
            io.to(room_1.id).emit("user-disconnected", { socketId: socket.id });
            io.to(room_1.id).emit("room-update", {
                connectedUsers: room_1.connectedUsers,
            });
        }
        else {
            rooms = rooms === null || rooms === void 0 ? void 0 : rooms.filter(function (roomFromRooms) { return roomFromRooms.id !== room_1.id; });
        }
    }
};
var signaling = function (data, socket) {
    var connUserSocketId = data.connUserSocketId, signal = data.signal;
    var signalingData = { signal: signal, connUserSocketId: socket.id };
    io.to(connUserSocketId).emit("conn-signal", signalingData);
};
var initializeConnetion = function (data, socket) {
    var connUserSocketId = data.connUserSocketId;
    var initData = { connUserSocketId: socket.id };
    io.to(connUserSocketId).emit("conn-init", initData);
};
server.listen(PORT, function () { return console.log("\uD83D\uDE80 listening on *:" + PORT); });
