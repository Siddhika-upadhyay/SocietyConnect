
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
  
  // Nested comments support
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  depth: {
    type: Number,
    default: 0,
    max: 3 // Limit nesting depth to 3 levels for better UX
  },
  replyCount: {
    type: Number,
    default: 0
  },
  
  // Performance optimization
  path: {
    type: String,
    default: ''
  },
  
  // Sort order for comments and replies
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
});

// Index for efficient queries
commentSchema.index({ postId: 1, parentId: 1, order: -1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ path: 1 });

// Virtual for getting direct replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  options: { sort: { order: -1, createdAt: -1 } }
});

// Method to generate path for nested structure
commentSchema.pre('save', function(next) {
  if (this.isNew && this.parentId) {
    // This will be set by the parent comment in the route handler
    this.path = this._id.toString();
  } else if (this.isNew) {
    this.path = this._id.toString();
  }
  next();
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
