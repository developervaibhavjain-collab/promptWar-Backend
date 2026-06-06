import WellnessEntry from '../models/WellnessEntry.js';
import { analyzeWellness } from '../services/geminiService.js';

// @desc    Analyze wellness metrics using Gemini AI
// @route   POST /api/wellness/analyze
// @access  Public
export const analyzeMetrics = async (req, res, next) => {
  try {
    const { mood, stressLevel, sleepHours, studyHours, concern } = req.body;

    // Simple validation
    if (!mood || stressLevel === undefined || sleepHours === undefined || studyHours === undefined || !concern) {
      res.status(400);
      throw new Error('Please provide mood, stressLevel, sleepHours, studyHours, and concern');
    }

    const stress = Number(stressLevel);
    const sleep = Number(sleepHours);
    const study = Number(studyHours);

    if (isNaN(stress) || stress < 1 || stress > 10) {
      res.status(400);
      throw new Error('Stress level must be a number between 1 and 10');
    }
    if (isNaN(sleep) || sleep < 0 || sleep > 24) {
      res.status(400);
      throw new Error('Sleep hours must be a valid number between 0 and 24');
    }
    if (isNaN(study) || study < 0 || study > 24) {
      res.status(400);
      throw new Error('Study hours must be a valid number between 0 and 24');
    }

    const analysis = await analyzeWellness(mood, stress, sleep, study, concern);

    res.json({
      mood,
      stressLevel: stress,
      sleepHours: sleep,
      studyHours: study,
      concern,
      ...analysis
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save wellness assessment to history
// @route   POST /api/wellness/save
// @access  Public
export const saveEntry = async (req, res, next) => {
  try {
    const {
      mood,
      stressLevel,
      sleepHours,
      studyHours,
      concern,
      wellnessScore,
      burnoutRisk,
      advice,
      dailyPlan,
      motivation
    } = req.body;

    // Basic validation of required fields
    if (!mood || stressLevel === undefined || sleepHours === undefined || studyHours === undefined || !concern || wellnessScore === undefined || !burnoutRisk || !advice || !dailyPlan || !motivation) {
      res.status(400);
      throw new Error('Missing required fields to save wellness entry');
    }

    const newEntry = new WellnessEntry({
      mood,
      stressLevel: Number(stressLevel),
      sleepHours: Number(sleepHours),
      studyHours: Number(studyHours),
      concern,
      wellnessScore: Number(wellnessScore),
      burnoutRisk,
      advice,
      dailyPlan,
      motivation,
      userEmail: req.user.email
    });

    const savedEntry = await newEntry.save();
    res.status(201).json(savedEntry);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all wellness entry histories
// @route   GET /api/wellness/history
// @access  Public
export const getHistory = async (req, res, next) => {
  try {
    const entries = await WellnessEntry.find({ userEmail: req.user.email }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific wellness entry by ID
// @route   GET /api/wellness/history/:id
// @access  Public
export const getEntryById = async (req, res, next) => {
  try {
    const entry = await WellnessEntry.findById(req.params.id);
    
    if (!entry) {
      res.status(404);
      throw new Error('Wellness entry not found');
    }

    if (entry.userEmail !== req.user.email) {
      res.status(403);
      throw new Error('Not authorized to access this entry');
    }

    res.json(entry);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a specific wellness entry
// @route   DELETE /api/wellness/history/:id
// @access  Public
export const deleteEntry = async (req, res, next) => {
  try {
    const entry = await WellnessEntry.findById(req.params.id);

    if (!entry) {
      res.status(404);
      throw new Error('Wellness entry not found');
    }

    if (entry.userEmail !== req.user.email) {
      res.status(403);
      throw new Error('Not authorized to delete this entry');
    }

    await entry.deleteOne();
    res.json({ message: 'Wellness entry removed', id: req.params.id });
  } catch (error) {
    next(error);
  }
};
