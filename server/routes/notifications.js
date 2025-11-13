const router = require('express').Router();
const Notification = require('../models/notification.model');
const auth = require('../middleware/auth');

// --- GET: Fetch all notifications for the logged-in user ---
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 }) // Show newest first
      .populate('sender', 'username') // Get the sender's username
      .populate('post', '_id'); // Get the post's ID
    res.json(notifications);
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

// --- POST: Mark all notifications as read for the logged-in user ---
router.post('/mark-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ msg: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

module.exports = router;