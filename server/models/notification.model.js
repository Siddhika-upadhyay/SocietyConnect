const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  recipient: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: {
    type: String,
    required: true,
    enum: ['comment', 'like', 'message']
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  },
 
  read: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;