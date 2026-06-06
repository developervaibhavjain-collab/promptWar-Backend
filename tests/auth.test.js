import request from 'supertest';
import app from '../app.js';
import * as userService from '../services/userService.js';
import bcrypt from 'bcryptjs';

// Mock the user service to avoid modifying the real users.json file
jest.mock('../services/userService.js', () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  saveUserRefreshToken: jest.fn(),
  clearUserRefreshToken: jest.fn(),
  readUsers: jest.fn(),
}));

// Mock bcryptjs to isolate tests from actual cryptography functions
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn().mockResolvedValue('mock_salt'),
  hash: jest.fn().mockResolvedValue('mock_hashed_password'),
}));

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return tokens', async () => {
      userService.findUserByEmail.mockReturnValue(null);
      userService.createUser.mockImplementation((user) => user);
      userService.saveUserRefreshToken.mockReturnValue(true);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(userService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userService.createUser).toHaveBeenCalled();
      expect(userService.saveUserRefreshToken).toHaveBeenCalled();
    });

    it('should fail registration if email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('valid email address');
    });

    it('should fail registration if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('at least 6 characters');
    });

    it('should fail registration if user already exists', async () => {
      userService.findUserByEmail.mockReturnValue({ email: 'test@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'mock_hashed_password',
      };

      userService.findUserByEmail.mockReturnValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      userService.saveUserRefreshToken.mockReturnValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'mock_hashed_password');
    });

    it('should fail login with incorrect password', async () => {
      userService.findUserByEmail.mockReturnValue({
        id: 'user123',
        email: 'test@example.com',
        password: 'mock_hashed_password',
      });
      bcrypt.compare.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should fail login if user does not exist', async () => {
      userService.findUserByEmail.mockReturnValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should fail refresh if no token provided', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear refresh token and log out', async () => {
      userService.clearUserRefreshToken.mockReturnValue(true);

      const res = await request(app)
        .post('/api/auth/logout')
        .send({ email: 'test@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Logged out successfully');
      expect(userService.clearUserRefreshToken).toHaveBeenCalledWith('test@example.com');
    });
  });
});
