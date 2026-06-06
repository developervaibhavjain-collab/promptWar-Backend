import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import WellnessEntry from '../models/WellnessEntry.js';
import { analyzeWellness } from '../services/geminiService.js';
import * as userService from '../services/userService.js';

// Mock Mongoose WellnessEntry Model
jest.mock('../models/WellnessEntry.js', () => {
  const mockConstructor = jest.fn().mockImplementation((data) => {
    return {
      ...data,
      save: jest.fn().mockResolvedValue({ _id: 'mock_entry_id', ...data }),
    };
  });
  return mockConstructor;
});

// Mock Gemini Service
jest.mock('../services/geminiService.js', () => ({
  analyzeWellness: jest.fn(),
}));

// Mock User Service
jest.mock('../services/userService.js', () => ({
  findUserByEmail: jest.fn(),
}));

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'mindmate_access_secret_key_jwt_5001_prod';

// Helper to generate a valid auth token for tests
const generateToken = (email = 'test@example.com') => {
  return jwt.sign({ id: 'user123', email }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

describe('Wellness Endpoints', () => {
  let token;

  beforeEach(() => {
    jest.clearAllMocks();
    token = generateToken();
    userService.findUserByEmail.mockReturnValue({ id: 'user123', email: 'test@example.com' });
  });

  describe('POST /api/wellness/analyze', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/wellness/analyze')
        .send({});
      expect(res.statusCode).toEqual(401);
    });

    it('should validate request body parameters', async () => {
      const res = await request(app)
        .post('/api/wellness/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ mood: 'Happy' }); // Missing stressLevel, sleepHours, etc.

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Please provide mood, stressLevel');
    });

    it('should return analysis metrics successfully', async () => {
      const mockAnalysis = {
        wellnessScore: 85,
        burnoutRisk: 'Low',
        advice: 'Good job keeping balance.',
        dailyPlan: '1. Sleep well.\n2. Keep studying.',
        motivation: 'You got this!',
      };
      analyzeWellness.mockResolvedValue(mockAnalysis);

      const res = await request(app)
        .post('/api/wellness/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mood: 'Happy',
          stressLevel: 3,
          sleepHours: 8,
          studyHours: 6,
          concern: 'Exam Pressure',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        mood: 'Happy',
        stressLevel: 3,
        sleepHours: 8,
        studyHours: 6,
        concern: 'Exam Pressure',
        ...mockAnalysis,
      });
      expect(analyzeWellness).toHaveBeenCalledWith('Happy', 3, 8, 6, 'Exam Pressure');
    });
  });

  describe('POST /api/wellness/save', () => {
    it('should save a wellness entry successfully', async () => {
      const mockRequestBody = {
        mood: 'Calm',
        stressLevel: 4,
        sleepHours: 7,
        studyHours: 5,
        concern: 'Time Management',
        wellnessScore: 75,
        burnoutRisk: 'Low',
        advice: 'Prioritize tasks.',
        dailyPlan: 'Plan the day.',
        motivation: 'Keep it up.',
      };

      const res = await request(app)
        .post('/api/wellness/save')
        .set('Authorization', `Bearer ${token}`)
        .send(mockRequestBody);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('_id', 'mock_entry_id');
      expect(res.body).toHaveProperty('userEmail', 'test@example.com');
      expect(res.body.mood).toEqual('Calm');
    });

    it('should reject invalid payloads', async () => {
      const res = await request(app)
        .post('/api/wellness/save')
        .set('Authorization', `Bearer ${token}`)
        .send({ mood: 'Calm' }); // Missing required fields

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Missing required fields');
    });
  });

  describe('GET /api/wellness/history', () => {
    it('should return wellness history for authenticated user', async () => {
      const mockHistory = [
        { _id: '1', mood: 'Happy', userEmail: 'test@example.com' },
        { _id: '2', mood: 'Stressed', userEmail: 'test@example.com' },
      ];
      
      WellnessEntry.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockHistory),
      });

      const res = await request(app)
        .get('/api/wellness/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockHistory);
      expect(WellnessEntry.find).toHaveBeenCalledWith({ userEmail: 'test@example.com' });
    });
  });

  describe('DELETE /api/wellness/history/:id', () => {
    it('should delete a wellness entry by id', async () => {
      const mockDelete = jest.fn().mockResolvedValue(true);
      const mockEntry = {
        _id: 'entry123',
        userEmail: 'test@example.com',
        deleteOne: mockDelete,
      };

      WellnessEntry.findById = jest.fn().mockResolvedValue(mockEntry);

      const res = await request(app)
        .delete('/api/wellness/history/entry123')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Wellness entry removed');
      expect(res.body).toHaveProperty('id', 'entry123');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should fail delete if not the owner of the entry', async () => {
      const mockEntry = {
        _id: 'entry123',
        userEmail: 'other@example.com',
      };

      WellnessEntry.findById = jest.fn().mockResolvedValue(mockEntry);

      const res = await request(app)
        .delete('/api/wellness/history/entry123')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('Not authorized to delete');
    });

    it('should fail delete if entry not found', async () => {
      WellnessEntry.findById = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/wellness/history/nonexistent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('not found');
    });
  });
});
