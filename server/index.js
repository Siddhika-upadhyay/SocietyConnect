require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "DELETE"]
  }
});

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("✅ MongoDB database connection established successfully");
});

let userSocketMap = new Map();
app.set('socketio', io);
app.set('userSocketMap', userSocketMap);

// API Routes
const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const categoriesRouter = require('./routes/categories'); // --- Add this line ---

app.use('/api/posts', postsRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/categories', categoriesRouter); // --- Add this line ---

// Socket.io connection logic
// ... (rest of the file remains the same)
io.on('connection', (socket) => {
  console.log(`a user connected: ${socket.id}`);
  socket.on('addUser', (userId) => {
    userSocketMap.set(userId, socket.id);
    console.log(`User ${userId} added with socket ID ${socket.id}`);
  });
  socket.on('disconnect', () => {
    for (let [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
    console.log('user disconnected');
  });
});

server.listen(port, () => {
  console.log(`🚀 Server is running on port: ${port}`);
});