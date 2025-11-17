const router = require('express').Router();
const User = require('../models/user.model');
const Post = require('../models/post.model'); // We need the Post model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- REGISTER a new user ---
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const newUser = new User({ name, email, password, phone });
    const savedUser = await newUser.save();

    const token = jwt.sign(
      { id: savedUser._id },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: savedUser._id,
        email: savedUser.email,
        name: savedUser.name,
        phone: savedUser.phone
      }
    });

  } catch (err) {
    console.error("Register Error:", err.message);
    res.status(500).json('Error: ' + err.message);
  }
});

// --- LOGIN a user ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json('Error: ' + err.message);
  }
});

// --- NEW: GET User Profile Page ---
// This route fetches a user's profile and all their posts
router.get('/:email', async (req, res) => {
  try {
    // Find the user by their email
    const user = await User.findOne({ email: req.params.email }).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Find all posts made by that user
    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .populate('author', 'email name')
      .populate('category', 'name')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'name email' }
      });

    // Send back the user's info and their posts
    res.json({ user, posts });

  } catch (err) {
    console.error("Profile fetch error:", err.message);
    res.status(500).json('Error: ' + err.message);
  }
});

module.exports = router;