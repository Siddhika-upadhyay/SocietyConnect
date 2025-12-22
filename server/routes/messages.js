
const router = require('express').Router();

const Message = require('../models/message.model');
const User = require('../models/user.model');
const Group = require('../models/group.model');
const auth = require('../middleware/auth');
const multer = require('multer');
const { messagesStorage } = require('../config/cloudinary');


// Configure multer for file uploads
const upload = multer({ storage: messagesStorage });

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

      // Count unread messages from this user (only if receiver is current user and message is unread)
      if (msg.receiver._id.toString() === userId && !msg.read) {
        conversations[otherUserId].unreadCount++;
      }
    });

    // Sort conversations by last message timestamp (most recent first)
    const sortedConversations = Object.values(conversations).sort((a, b) =>
      new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );

    res.json(sortedConversations);
  } catch (err) {
    console.error("Fetch conversations error:", err.message);
    res.status(500).json('Error: ' + err.message);
  }
});

// GET /api/messages/:userId - Fetch messages with specific user (only match valid ObjectIds)
router.get('/:userId', auth, async (req, res) => {
  // Validate that userId is a valid ObjectId
  if (!/^[0-9a-fA-F]{24}$/.test(req.params.userId)) {
    return res.status(400).json({ msg: 'Invalid user ID format' });
  }
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
    const { receiverId, groupId, content, messageType, replyTo } = req.body;
    const senderId = req.user.id;

    if ((!receiverId && !groupId) || (!content && messageType === 'text')) {
      return res.status(400).json({ msg: 'Receiver/group and content are required for text messages' });
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      group: groupId,
      content: content?.trim(),
      messageType: messageType || 'text',
      replyTo
    });

    const savedMessage = await newMessage.save();

    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('group', 'name avatar')
      .populate('replyTo');

    // Update conversation last message
    if (groupId) {
      await Group.findByIdAndUpdate(groupId, {
        lastMessage: savedMessage._id,
        $inc: { messageCount: 1 }
      });
    }

    // Create notification for the receiver(s)
    const Notification = require('../models/notification.model');
    let recipients = [];

    if (receiverId) {
      recipients = [receiverId];
    } else if (groupId) {
      const group = await Group.findById(groupId).populate('members.user');
      recipients = group.members
        .filter(member => member.user._id.toString() !== senderId)
        .map(member => member.user._id.toString());
    }

    // Emit message and notification via sockets
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');

    recipients.forEach(async (recipientId) => {
      const existingNotification = await Notification.findOne({
        recipient: recipientId,
        sender: senderId,
        type: 'message',
        read: false
      });

      if (!existingNotification) {
        const notification = await Notification.create({
          recipient: recipientId,
          sender: senderId,
          type: 'message'
        });

        const populatedNotification = await Notification.findById(notification._id)
          .populate('sender', 'name email avatar');

        const recipientSocketId = userSocketMap.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_notification', populatedNotification);
        }
      }
    });

    // Emit message via sockets
    if (receiverId) {
      const receiverSocketId = userSocketMap.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receiveMessage', populatedMessage);
      }
    } else if (groupId) {
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

    res.json(populatedMessage);

  } catch (err) {
    console.error("Send message error:", err.message);
    res.status(500).json({ error: err.message });
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


// POST /api/messages/upload - Upload media files
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Get file type and create appropriate response
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    const mimeType = req.file.mimetype;
    
    let messageType = 'file';
    if (mimeType.startsWith('image/')) {
      messageType = 'image';
    } else if (mimeType.startsWith('video/')) {
      messageType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      messageType = 'audio';
    }



    // Create optimized URL based on file type
    let mediaUrl;
    if (messageType === 'audio') {
      // For audio files, use direct streaming link without attachment flag
      mediaUrl = req.file.path;
    } else if (messageType === 'video') {
      // For video files, use direct streaming link without attachment flag
      mediaUrl = req.file.path;
    } else if (mimeType === 'application/pdf') {
      // For PDFs, use streaming link for preview
      mediaUrl = req.file.path;
    } else if (['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType)) {
      // For documents, use streaming link for preview
      mediaUrl = req.file.path;
    } else {
      // For other files (images, download-only files), use attachment flag
      mediaUrl = req.file.path.replace('/upload/', '/upload/fl_attachment/');
    }

    res.json({
      mediaUrl: mediaUrl,
      publicId: req.file.filename,
      fileName: req.file.originalname,
      size: req.file.size,
      messageType: messageType,
      mimeType: mimeType,
      fileExtension: fileExtension
    });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/messages/:id/edit - Edit a message
router.put('/:id/edit', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const messageId = req.params.id;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ msg: 'Can only edit your own messages' });
    }

    if (message.deleted) {
      return res.status(400).json({ msg: 'Cannot edit deleted message' });
    }

    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(messageId)
      .populate('sender', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('group', 'name avatar');

    res.json(populatedMessage);
  } catch (err) {
    console.error('Edit message error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages/:id - Delete a message
router.delete('/:id', auth, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ msg: 'Can only delete your own messages' });
    }

    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({ msg: 'Message deleted successfully' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/search - Search messages
router.get('/search', auth, async (req, res) => {
  try {
    const { q, conversationId } = req.query;
    const userId = req.user.id;

    if (!q) {
      return res.status(400).json({ msg: 'Search query is required' });
    }

    let query = {
      $or: [
        { sender: userId },
        { receiver: userId }
      ],
      content: { $regex: q, $options: 'i' },
      deleted: false
    };

    if (conversationId) {
      // Search in specific conversation
      const conversation = await Message.findById(conversationId);
      if (conversation) {
        if (conversation.receiver) {
          query = {
            $or: [
              { sender: userId, receiver: conversation.receiver },
              { sender: conversation.receiver, receiver: userId }
            ],
            content: { $regex: q, $options: 'i' },
            deleted: false
          };
        } else if (conversation.group) {
          query = {
            group: conversation.group,
            content: { $regex: q, $options: 'i' },
            deleted: false
          };
        }
      }
    }

    const messages = await Message.find(query)
      .populate('sender', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('group', 'name avatar')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(messages);
  } catch (err) {
    console.error('Search messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
