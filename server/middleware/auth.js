

const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  let token = req.header('x-auth-token');

  // If no x-auth-token header, check for Authorization Bearer token
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  // Check for token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    // Add user from payload
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
}

module.exports = auth;
