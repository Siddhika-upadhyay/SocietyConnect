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
    origin: ["http://localhost:5173", "http://localhost:5174", "https://societyconnect.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const port = process.env.PORT || 5001;


app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "https://societyconnect.vercel.app"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type", "Content-Length"]
}));
app.use(express.json());

const uri = process.env.MONGO_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', async () => {
  console.log("✅ MongoDB database connection established successfully");
  // Seed categories on startup
  const seedCategories = require('./seedCategories');
  await seedCategories();
});

let userSocketMap = new Map();
let typingUsers = new Map(); // Track typing users per conversation
app.set('socketio', io);
app.set('userSocketMap', userSocketMap);
app.set('typingUsers', typingUsers);

// API Routes
const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const categoriesRouter = require('./routes/categories');
const messagesRouter = require('./routes/messages');
const groupsRouter = require('./routes/groups');
const callsRouter = require('./routes/calls');
const communitiesRouter = require('./routes/communities');

app.use('/api/posts', postsRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/communities', communitiesRouter);

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`a user connected: ${socket.id}`);

  socket.on('addUser', async (userId) => {
    userSocketMap.set(userId, socket.id);

    // Update user online status
    const User = require('./models/user.model');
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
      socketId: socket.id
    });

    console.log(`User ${userId} added with socket ID ${socket.id}`);

    // Broadcast presence update
    socket.broadcast.emit('userPresenceUpdate', {
      userId,
      isOnline: true,
      lastSeen: new Date()
    });
  });

  // Handle sending messages
  socket.on('sendMessage', async (data) => {
    try {
      const { receiverId, groupId, content, senderId, messageType, mediaUrl, fileName, fileSize } = data;
      const Message = require('./models/message.model');

      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        group: groupId,
        content,
        messageType: messageType || 'text',
        mediaUrl,
        fileName,
        fileSize
      });

      const savedMessage = await newMessage.save();
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'name email avatar')
        .populate('receiver', 'name email avatar')
        .populate('group', 'name avatar');

      // Emit to receiver or group members
      if (receiverId) {
        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receiveMessage', populatedMessage);
        }
      } else if (groupId) {
        // Emit to all group members except sender
        const Group = require('./models/group.model');
        const group = await Group.findById(groupId).populate('members.user');
        group.members.forEach(member => {
          if (member.user._id.toString() !== senderId) {
            const memberSocketId = userSocketMap.get(member.user._id.toString());
            if (memberSocketId) {
              io.to(memberSocketId).emit('receiveMessage', populatedMessage);
            }
          }
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { conversationId, userId, isTyping } = data;
    const key = `${conversationId}`;

    if (!typingUsers.has(key)) {
      typingUsers.set(key, new Set());
    }

    const conversationTyping = typingUsers.get(key);

    if (isTyping) {
      conversationTyping.add(userId);
    } else {
      conversationTyping.delete(userId);
    }

    // Emit typing status to other participants
    socket.to(conversationId).emit('typingUpdate', {
      conversationId,
      typingUsers: Array.from(conversationTyping)
    });
  });

  // Handle presence updates
  socket.on('updatePresence', async (data) => {
    const { userId, status } = data;
    const User = require('./models/user.model');

    await User.findByIdAndUpdate(userId, {
      status,
      lastSeen: new Date()
    });

    socket.broadcast.emit('userPresenceUpdate', {
      userId,
      status,
      lastSeen: new Date()
    });
  });

  // 🔥 FIX: Enhanced call signaling with better error handling
  socket.on('callUser', (data) => {
    try {
      const { userToCall, signalData, fromUser, name } = data;
      console.log(`Forwarding call from ${fromUser} to ${userToCall}`);
      
      const receiverSocketId = userSocketMap.get(userToCall);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('callUser', {
          signal: signalData,
          from: fromUser,
          name: name || 'Unknown User'
        });
        console.log(`Call signal sent to ${receiverSocketId}`);
      } else {
        console.log(`User ${userToCall} is not online`);
        // Optionally send back a "user unavailable" signal
        socket.emit('callFailed', { reason: 'User is not online' });
      }
    } catch (err) {
      console.error('Error handling callUser:', err);
      socket.emit('callFailed', { reason: 'Call setup failed' });
    }
  });

  socket.on('answerCall', (data) => {
    try {
      const { to, signal } = data;
      console.log(`Answering call to ${to}`);
      
      const callerSocketId = userSocketMap.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit('callAccepted', signal);
        console.log(`Call answer sent to ${callerSocketId}`);
      } else {
        console.log(`Caller ${to} is not available`);
        socket.emit('callFailed', { reason: 'Caller is not available' });
      }
    } catch (err) {
      console.error('Error handling answerCall:', err);
    }
  });

  socket.on('endCall', (data) => {
    try {
      const { to } = data;
      console.log(`Ending call to ${to}`);
      
      const targetSocketId = userSocketMap.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('callEnded');
        console.log(`Call ended signal sent to ${targetSocketId}`);
      } else {
        console.log(`Target ${to} is not available`);
      }
    } catch (err) {
      console.error('Error handling endCall:', err);
    }
  });

  socket.on('disconnect', async () => {
    // Find disconnected user
    let disconnectedUserId = null;
    for (let [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        userSocketMap.delete(userId);
        break;
      }
    }

    if (disconnectedUserId) {
      // Update user offline status
      const User = require('./models/user.model');
      await User.findByIdAndUpdate(disconnectedUserId, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: null
      });

      // Broadcast presence update
      socket.broadcast.emit('userPresenceUpdate', {
        userId: disconnectedUserId,
        isOnline: false,
        lastSeen: new Date()
      });

      console.log(`User ${disconnectedUserId} disconnected`);
    }

    console.log('user disconnected');
  });
});

server.listen(port, () => {
  console.log(`🚀 Server is running on port: ${port}`);
});