const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  messageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
});

// Add createdBy as admin by default
groupSchema.pre('save', function(next) {
  if (this.isNew && this.createdBy && !this.admins.includes(this.createdBy)) {
    this.admins.push(this.createdBy);
  }
  next();
});

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;
