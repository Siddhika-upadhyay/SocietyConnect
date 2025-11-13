const router = require('express').Router();
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- REGISTER a new user ---
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const newUser = new User({ username, password });
    const savedUser = await newUser.save();
    res.json({
      user: {
        id: savedUser._id,
        username: savedUser.username
      }
    });

  } catch (err) {
    console.error("Register Error:", err.message); // Better error logging
    res.status(500).json('Error: ' + err.message);
  }
});

// --- LOGIN a user ---
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const user = await User.findOne({ username });
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
        username: user.username
      }
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json('Error: ' + err.message);
  }
});

module.exports = router;