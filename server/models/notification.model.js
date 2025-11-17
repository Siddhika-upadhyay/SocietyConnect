const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  // The user who will receive the notification
  recipient: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // The user who triggered the notification (e.g., the one who commented)
  sender: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // The type of notification (e.g., 'comment', 'like', or 'message')
  type: {
    type: String,
    required: true,
    enum: ['comment', 'like', 'message']
  },
  // The post that the notification is related to (optional for message notifications)
  post: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  },
  // A flag to see if the user has read the notification yet
  read: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;