import jwt from 'jsonwebtoken';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided', status: 'error' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token', status: 'error' });
    }
    req.user = user;
    next();
  });
};

// Middleware to authorize roles
export const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required', status: 'error' });
    }
    
    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.', status: 'error' });
    }
    
    next();
  };
};