const mongoose = require('mongoose');
const Category = require('./models/category.model');

const seedCategories = async () => {
  try {
    const categories = [
      { name: 'Announcements', description: 'Community announcements and updates' },
      { name: 'Help Needed', description: 'Requests for help or assistance' },
      { name: 'Sale', description: 'Items for sale or services offered' },
      { name: 'Recommendations', description: 'Recommendations and suggestions' }
    ];

    for (const cat of categories) {
      const existing = await Category.findOne({ name: cat.name });
      if (!existing) {
        await Category.create(cat);
        console.log(`✅ Seeded category: ${cat.name}`);
      } else {
        console.log(`ℹ️ Category already exists: ${cat.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  }
};

module.exports = seedCategories;
