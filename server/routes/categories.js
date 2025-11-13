const router = require('express').Router();
const Category = require('../models/category.model');
const auth = require('../middleware/auth');

// --- GET: Fetch all categories ---
// This is public, so any user (even logged out) can see them
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

// --- POST: Create a new category ---
// We can protect this with 'auth' middleware if we want only admins to do this.
// For now, we'll let any logged-in user create one for testing.
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ msg: 'Category name is required' });
    }
    const newCategory = new Category({ name, description });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

module.exports = router;