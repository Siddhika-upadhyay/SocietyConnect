const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // --- NEW: Add the category field ---
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
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }]
}, {
  timestamps: true,
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;