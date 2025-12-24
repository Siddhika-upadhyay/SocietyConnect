
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  // Basic comment fields
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  // Simple flat comments - no nesting
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  }
}, {
  timestamps: true,
});

// Index for efficient queries
commentSchema.index({ postId: 1, createdAt: -1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
