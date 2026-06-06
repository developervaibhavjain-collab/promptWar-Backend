import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  createUser,
  saveUserRefreshToken,
  clearUserRefreshToken,
  readUsers
} from '../services/userService.js';

// Secrets from environment or fallbacks
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'mindmate_access_secret_key_jwt_5001_prod';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'mindmate_refresh_secret_key_jwt_5001_prod';

// Helper to generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );
};

// Helper to generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' } // Long-lived refresh token
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password');
    }

    // Check email pattern simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Please enter a valid email address');
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if user already exists
    const userExists = findUserByEmail(email);
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    createUser(newUser);

    // Generate tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Save refresh token
    saveUserRefreshToken(email, refreshToken);

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login a user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password');
    }

    // Find user
    const user = findUserByEmail(email);
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    saveUserRefreshToken(email, refreshToken);

    res.json({
      user: {
        id: user.id,
        email: user.email
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400);
      throw new Error('Refresh token is required');
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      res.status(403);
      throw new Error('Invalid or expired refresh token');
    }

    // Find user and match token
    const user = findUserByEmail(decoded.email);
    if (!user || user.refreshToken !== refreshToken) {
      res.status(403);
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens (token rotation is good, but at least new access token is needed)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Save new refresh token
    saveUserRefreshToken(user.email, newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear token
// @route   POST /api/auth/logout
// @access  Public (or Protected, but public allows easy client clearance)
export const logout = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (email) {
      clearUserRefreshToken(email);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
