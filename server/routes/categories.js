const router = require('express').Router();
const Category = require('../models/category.model');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

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
// Only admins can create categories
router.post('/', auth, admin, async (req, res) => {
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

// --- PUT: Update a category ---
// Only admins can update categories
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ msg: 'Category not found' });
    }
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

// --- DELETE: Delete a category ---
// Only admins can delete categories
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ msg: 'Category not found' });
    }
    res.json({ msg: 'Category deleted' });
  } catch (err) {
    res.status(500).json('Error: ' + err);
  }
});

module.exports = router;
