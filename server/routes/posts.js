const router = require('express').Router();
const multer = require('multer');
const { postsStorage } = require('../config/cloudinary');
const Post = require('../models/post.model');
const Comment = require('../models/comment.model');
const Notification = require('../models/notification.model');
const auth = require('../middleware/auth');

const upload = multer({ 
  storage: postsStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});


// --- GET: Fetch all posts ---
router.get('/', async (req, res) => {
  try {
    const { category, search, communityId } = req.query;
    let filter = {};
    if (category) {
      filter.category = category;
    }
    if (communityId) {
      filter.community = communityId;
    } else {
      // By default, show only global posts (no community) unless communityId is specified
      // If you want to show ALL posts on home page, remove this line
      // filter.community = null;
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
      .populate('community', 'name avatar');

    // Get comment counts for each post
    const postIds = posts.map(post => post._id);
    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: postIds }, isDeleted: false } },
      { $group: { _id: '$postId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    commentCounts.forEach(item => {
      countMap[item._id.toString()] = item.count;
    });

    // Add comment count to each post
    const postsWithCounts = posts.map(post => ({
      ...post.toObject(),
      commentCount: countMap[post._id.toString()] || 0
    }));

    res.json(postsWithCounts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json('Error: ' + err);
  }
});

// --- POST: Create a new post ---
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { content, category, community } = req.body;
    if (!category) {
      return res.status(400).json({ msg: 'Category is required' });
    }
    
    let imageUrl = '';
    let cloudinaryPublicId = '';
    
    // Handle file upload
    if (req.file) {
      try {
        imageUrl = req.file.path;
        cloudinaryPublicId = req.file.filename || req.file.public_id;
        console.log('Image uploaded successfully:', {
          url: imageUrl,
          publicId: cloudinaryPublicId,
          size: req.file.size
        });
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(500).json({ 
          msg: 'Failed to upload image', 
          error: uploadError.message 
        });
      }
    }
    
    const postData = { 
      content, 
      imageUrl, 
      cloudinaryPublicId,
      category, 
      author: req.user.id 
    };

    // Add community if provided
    if (community) {
      postData.community = community;
    }

    const newPost = new Post(postData);
    const savedPost = await newPost.save();
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'name email')
      .populate('category', 'name')
      .populate('community', 'name avatar');
    
    const io = req.app.get('socketio');
    io.emit('post_created', populatedPost);
    
    console.log('Post created successfully:', {
      postId: savedPost._id,
      hasImage: !!imageUrl,
      imageUrl: imageUrl
    });
    
    res.status(201).json(populatedPost);
  } catch (err) {
    console.error('Post creation error:', err);
    res.status(400).json({ 
      msg: 'Error creating post', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
        // Populate sender data for real-time notification
        const populatedNotification = await Notification.findById(notification._id).populate('sender', 'name email');
        const recipientSocketId = userSocketMap.get(post.author.toString());
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_notification', populatedNotification);
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



// --- GET: Fetch all comments for a post (flat) ---
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Fetch comments for the post with pagination
    const comments = await Comment.find({ postId, isDeleted: false })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await Comment.countDocuments({ postId, isDeleted: false });

    res.json({
      comments: comments,
      totalComments: totalCount,
      hasMore: (parseInt(offset) + comments.length) < totalCount
    });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json('Error: ' + err);
  }
});

// --- POST: Add a new comment ---
router.post('/:postId/comments', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ msg: 'Comment text is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Check for duplicate comment from same user (within 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    const duplicateCheck = await Comment.findOne({
      author: req.user.id,
      postId,
      text: text.trim(),
      createdAt: { $gte: thirtySecondsAgo }
    });

    if (duplicateCheck) {
      return res.status(400).json({ msg: 'Duplicate comment detected. Please wait before posting again.' });
    }

    // Create the comment
    const newComment = new Comment({
      text: text.trim(),
      author: req.user.id,
      postId
    });

    const savedComment = await newComment.save();

    // Populate author information
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('author', 'name email')
      .lean();

    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');

    // Emit the new comment event
    io.emit('comment_added', {
      postId,
      comment: populatedComment,
      timestamp: Date.now()
    });

    // Send notification to post author
    if (post.author.toString() !== req.user.id) {
      const notification = new Notification({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        post: post._id,
        comment: savedComment._id,
      });
      await notification.save();

      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'name email');

      const recipientSocketId = userSocketMap.get(post.author.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', populatedNotification);
      }
    }

    res.status(201).json(populatedComment);
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json('Error: ' + err);
  }
});


// --- DELETE: Delete a comment ---
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ msg: 'Comment not found' });

    // Check authorization
    if (comment.author.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const io = req.app.get('socketio');

    // Delete the comment
    await Comment.findByIdAndDelete(req.params.commentId);

    // Emit deletion event
    io.emit('comment_deleted', {
      postId: comment.postId.toString(),
      commentId: req.params.commentId
    });

    res.json({ msg: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json('Error: ' + err);
  }
});

// --- PUT: Update a post ---
router.put('/:postId', auth, upload.single('image'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ msg: 'Post not found' });
    if (post.author.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const { content, category } = req.body;
    if (content !== undefined) post.content = content;
    if (category !== undefined) post.category = category;
    if (req.file) post.imageUrl = req.file.path;


    const savedPost = await post.save();
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'name email')
      .populate('category', 'name');

    const io = req.app.get('socketio');
    io.emit('post_updated', populatedPost);
    res.json(populatedPost);
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

// --- DELETE: Delete a post ---
router.delete('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ msg: 'Post not found' });
    if (post.author.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Post.findByIdAndDelete(req.params.postId);
    const io = req.app.get('socketio');
    io.emit('post_deleted', req.params.postId);
    res.json({ msg: 'Post deleted' });
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

module.exports = router;
