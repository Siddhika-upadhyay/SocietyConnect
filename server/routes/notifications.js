const router = require('express').Router();
const Notification = require('../models/notification.model');
const auth = require('../middleware/auth');
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id, read: false })
      .sort({ createdAt: -1 })
      .populate('sender', 'name email')
      .populate('post', '_id');
    res.json(notifications);
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});
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

// PUT /api/notifications/:id/read - Mark specific notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    // Only recipient can mark as read
    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    notification.read = true;
    await notification.save();

    res.json({ msg: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

module.exports = router;