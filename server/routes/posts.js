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
      .populate('category', 'name');

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



// Helper function to build nested comment structure
const buildNestedComments = (comments, parentId = null) => {
  return comments
    .filter(comment => comment.parentId?.toString() === (parentId ? parentId.toString() : ''))
    .map(comment => ({
      ...comment.toObject(),
      replies: buildNestedComments(comments, comment._id)
    }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

// --- GET: Fetch all comments for a post (nested) ---
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Fetch all comments for the post
    const comments = await Comment.find({ postId })
      .populate('author', 'name email')
      .sort({ order: -1, createdAt: -1 })
      .lean();

    // Build nested structure
    const nestedComments = buildNestedComments(comments);
    
    res.json({
      comments: nestedComments,
      totalComments: comments.length
    });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json('Error: ' + err);
  }
});

// --- POST: Add a new comment or reply ---
router.post('/:postId/comments', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, parentId } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ msg: 'Comment text is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Handle nested comments
    let parentComment = null;
    let depth = 0;
    let path = '';

    if (parentId) {
      parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return res.status(404).json({ msg: 'Parent comment not found' });
      }
      if (parentComment.depth >= 3) {
        return res.status(400).json({ msg: 'Maximum nesting depth reached' });
      }
      depth = parentComment.depth + 1;
      path = parentComment.path;
    }

    // Get the next order number for this level
    const lastComment = await Comment.findOne({
      postId,
      parentId: parentId || null
    }).sort({ order: -1 });

    const order = lastComment ? lastComment.order + 1 : 1;

    // Create the comment
    const newComment = new Comment({
      text: text.trim(),
      author: req.user.id,
      postId,
      parentId: parentId || null,
      depth,
      path,
      order
    });

    const savedComment = await newComment.save();
    
    // Update parent's reply count if this is a reply
    if (parentComment) {
      await Comment.findByIdAndUpdate(parentId, {
        $inc: { replyCount: 1 }
      });
    }

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
      parentId: parentId || null
    });

    // Send notification
    let notificationRecipient = post.author;
    if (parentComment && parentComment.author.toString() !== req.user.id) {
      notificationRecipient = parentComment.author;
    }

    if (notificationRecipient.toString() !== req.user.id) {
      const notification = new Notification({
        recipient: notificationRecipient,
        sender: req.user.id,
        type: parentComment ? 'reply' : 'comment',
        post: post._id,
        comment: savedComment._id,
      });
      await notification.save();
      
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'name email');
      
      const recipientSocketId = userSocketMap.get(notificationRecipient.toString());
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


// --- DELETE: "Smart delete" a comment ---
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ msg: 'Comment not found' });
    
    // Check authorization
    if (comment.author.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');

    // Mark comment as deleted
    comment.isDeleted = true;
    comment.text = '[message deleted]';
    await comment.save();

    // Get all replies and mark them as deleted too
    const replies = await Comment.find({ parentId: comment._id });
    for (const reply of replies) {
      reply.isDeleted = true;
      reply.text = '[message deleted]';
      await reply.save();
      
      // Recursively delete nested replies
      await deleteNestedReplies(reply._id, io, userSocketMap);
    }

    // Emit deletion event
    io.emit('comment_deleted', { 
      postId: comment.postId.toString(), 
      commentId: req.params.commentId 
    });

    res.json({ msg: 'Comment and its replies deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json('Error: ' + err);
  }
});

// Helper function to recursively delete nested replies
const deleteNestedReplies = async (commentId, io, userSocketMap) => {
  const replies = await Comment.find({ parentId: commentId });
  for (const reply of replies) {
    reply.isDeleted = true;
    reply.text = '[message deleted]';
    await reply.save();
    
    // Emit deletion for each reply
    io.emit('comment_deleted', { 
      postId: reply.postId.toString(), 
      commentId: reply._id.toString() 
    });
    
    // Recursively delete deeper replies
    await deleteNestedReplies(reply._id, io, userSocketMap);
  }
};

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
