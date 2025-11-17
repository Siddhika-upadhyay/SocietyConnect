const User = require('../models/user.model');

function admin(req, res, next) {
  // First, check if user is authenticated (auth middleware should run before this)
  if (!req.user) {
    return res.status(401).json({ msg: 'No user found, authorization denied' });
  }

  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ msg: 'Access denied, admin only' });
  }

  next();
}

module.exports = admin;
