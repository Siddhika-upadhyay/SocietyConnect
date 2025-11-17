const router = require('express').Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const Post = require('../models/post.model');
const Comment = require('../models/comment.model');
const Notification = require('../models/notification.model');
const auth = require('../middleware/auth');

const upload = multer({ storage });

// --- GET: Fetch all posts ---
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};
    if (category) {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { content: { $regex: search, $options: 'i' } },
        { 'category.name': { $regex: search, $options: 'i' } }
      ];
    }
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate('author', 'name email')
      .populate('category', 'name')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'name email' }
      });
    res.json(posts);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

// --- POST: Create a new post ---
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { content, category } = req.body;
    if (!category) {
      return res.status(400).json({ msg: 'Category is required' });
    }
    const imageUrl = req.file ? req.file.path : '';
    const newPost = new Post({ content, imageUrl, category, author: req.user.id });
    const savedPost = await newPost.save();
    const populatedPost = await Post.findById(savedPost._id)
                                    .populate('author', 'name email')
                                    .populate('category', 'name');
    const io = req.app.get('socketio');
    io.emit('post_created', populatedPost);
    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

// --- UPDATED: PUT route to Like/Unlike a post ---
router.put('/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');
    const loggedInUserId = req.user.id;

    const isLiked = post.likes.includes(loggedInUserId);
    if (isLiked) {
      post.likes = post.likes.filter(id => id.toString() !== loggedInUserId);
    } else {
      post.likes.push(loggedInUserId);
      if (post.author.toString() !== loggedInUserId) {
        const notification = new Notification({
          recipient: post.author,
          sender: loggedInUserId,
          type: 'like',
          post: post._id,
        });
        await notification.save();
        const recipientSocketId = userSocketMap.get(post.author.toString());
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_notification', notification);
        }
      }
    }

    const savedPost = await post.save();
    
    // --- THIS IS THE FIX ---
    // We must populate the post *after* saving, before emitting it.
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'name email')
      .populate('category', 'name');
    
    // Emit the fully populated post
    io.emit('post_updated', populatedPost);
    res.json(populatedPost); // Also send the populated post back

  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});


// --- POST: Add a new comment ---
router.post('/:postId/comments', auth, async (req, res) => {
  try {
    console.log('Comment request:', req.params.postId, req.body, req.user.id);
    const post = await Post.findById(req.params.postId);
    if (!post) {
      console.log('Post not found:', req.params.postId);
      return res.status(404).json({ msg: 'Post not found' });
    }
    const newComment = new Comment({ text: req.body.text, author: req.user.id });
    const savedComment = await newComment.save();
    post.comments.push(savedComment._id);
    await post.save();
    const populatedComment = await Comment.findById(savedComment._id).populate('author', 'name email');
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');
    io.emit('comment_added', { postId: req.params.postId, comment: populatedComment });
    if (post.author.toString() !== req.user.id) {
      const notification = new Notification({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        post: post._id,
      });
      await notification.save();
      const recipientSocketId = userSocketMap.get(post.author.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', notification);
      }
    }
    res.status(201).json(populatedComment);
  } catch (err) {
    console.error('Comment error:', err);
    res.status(400).json('Error: ' + err);
  }
});

// --- DELETE: "Smart delete" a comment ---
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ msg: 'Comment not found' });
    if (comment.author.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    comment.isDeleted = true;
    comment.text = '[message deleted]';
    await comment.save();
    const post = await Post.findOne({ comments: req.params.commentId });
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');
    io.emit('comment_deleted', { postId: post._id.toString(), commentId: req.params.commentId });
    res.json({ msg: 'Comment deleted' });
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

module.exports = router;