const router = require('express').Router();
const multer = require('multer'); // This line is the fix
const { storage } = require('../config/cloudinary');
const Post = require('../models/post.model');
const Comment = require('../models/comment.model');
const Notification = require('../models/notification.model');
const auth = require('../middleware/auth');

const upload = multer({ storage });

// GET all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).populate('author', 'username').populate({
      path: 'comments',
      populate: { path: 'author', select: 'username' }
    });
    res.json(posts);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

// POST a new post
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    const imageUrl = req.file ? req.file.path : '';
    const newPost = new Post({ content, imageUrl, author: req.user.id });
    const savedPost = await newPost.save();
    const populatedPost = await Post.findById(savedPost._id).populate('author', 'username');
    const io = req.app.get('socketio');
    io.emit('post_created', populatedPost);
    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

// POST a new comment
router.post('/:postId/comments', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    const newComment = new Comment({ text: req.body.text, author: req.user.id });
    const savedComment = await newComment.save();
    post.comments.push(savedComment._id);
    await post.save();
    const populatedComment = await Comment.findById(savedComment._id).populate('author', 'username');
    
    const io = req.app.get('socketio');
    io.emit('comment_added', { postId: req.params.postId, comment: populatedComment });
    
    if (post.author.toString() !== req.user.id) {
      const notification = new Notification({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        post: post._id,
      });
      await notification.save();

      const userSocketMap = req.app.get('userSocketMap');
      const recipientSocketId = userSocketMap.get(post.author.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', notification);
      }
    }
    
    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

// DELETE a comment
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
    io.emit('comment_deleted', { postId: post._id.toString(), commentId: req.params.commentId });
    res.json({ msg: 'Comment deleted' });
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

module.exports = router;