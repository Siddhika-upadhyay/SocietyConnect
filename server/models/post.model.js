const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  cloudinaryPublicId: {
    type: String,
    default: ''
  },
  // --- NEW: Add the likes array ---
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  // --- NEW: Optional community reference ---
  community: {
    type: Schema.Types.ObjectId,
    ref: 'Community',
    default: null
  },
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }]
}, {
  timestamps: true,
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;