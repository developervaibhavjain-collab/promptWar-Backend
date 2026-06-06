import jwt from 'jsonwebtoken';
import { findUserByEmail } from '../services/userService.js';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'mindmate_access_secret_key_jwt_5001_prod';

export const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

      // Verify user still exists in our users file
      const user = findUserByEmail(decoded.email);
      if (!user) {
        res.status(401);
        return next(new Error('Not authorized, user not found'));
      }

      // Add user info to request object
      req.user = {
        id: decoded.id,
        email: decoded.email
      };

      next();
    } catch (error) {
      console.error('JWT Verification error:', error.message);
      res.status(401);
      next(new Error('Not authorized, token failed or expired'));
    }
  } else {
    res.status(401);
    next(new Error('Not authorized, no token provided'));
  }
};
