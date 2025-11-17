const router = require('express').Router();
const Message = require('../models/message.model');
const auth = require('../middleware/auth');

// GET /api/messages - Fetch user's conversations (unique users they've messaged with)
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .populate('sender', 'name email')
    .populate('receiver', 'name email')
    .sort({ timestamp: -1 });

    // Group by conversation (other user)
    const conversations = {};
    messages.forEach(msg => {
      const otherUser = msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      const otherUserId = otherUser._id.toString();

      if (!conversations[otherUserId]) {
        conversations[otherUserId] = {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0
        };
      }

      // Count unread messages from this user
      if (msg.receiver._id.toString() === userId && !msg.read) {
        conversations[otherUserId].unreadCount++;
      }
    });

    res.json(Object.values(conversations));
  } catch (err) {
    console.error("Fetch conversations error:", err.message);
    res.status(500).json('Error: ' + err.message);
  }
});

// GET /api/messages/:userId - Fetch messages with specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
    .populate('sender', 'name email')
    .populate('receiver', 'name email')
    .sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Fetch messages error:", err.message);
    res.status(500).json('Error: ' + err.message);
  }
});

// POST /api/messages - Send a new message
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ msg: 'Receiver and content are required' });
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content.trim()
    });

    const savedMessage = await newMessage.save();
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name email')
      .populate('receiver', 'name email');

    // Create notification for the receiver
    const Notification = require('../models/notification.model');
    const existingNotification = await Notification.findOne({
      recipient: receiverId,
      sender: senderId,
      type: 'message',
      read: false
    });

    if (!existingNotification) {
      const notification = await Notification.create({
        recipient: receiverId,
        sender: senderId,
        type: 'message'
      });
      // Populate sender data for real-time notification
      const populatedNotification = await Notification.findById(notification._id).populate('sender', 'name email');
      const io = req.app.get('socketio');
      const userSocketMap = req.app.get('userSocketMap');
      const recipientSocketId = userSocketMap.get(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', populatedNotification);
      }
    }

    res.json(populatedMessage);
  } catch (err) {
    console.error("Send message error:", err.message);
    res.status(500).json('Error: ' + err.message);
  }
});

// PUT /api/messages/:id/read - Mark message as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    // Only receiver can mark as read
    if (message.receiver.toString() !== userId) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    message.read = true;
    await message.save();

    res.json({ msg: 'Message marked as read' });
  } catch (err) {
    console.error("Mark read error:", err.message);
    res.status(500).json('Error: ' + err.message);
  }
});

module.exports = router;
