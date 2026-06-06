import express from 'express';
import {
  analyzeMetrics,
  saveEntry,
  getHistory,
  getEntryById,
  deleteEntry,
} from '../controllers/wellnessController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/analyze', protect, analyzeMetrics);
router.post('/save', protect, saveEntry);
router.get('/history', protect, getHistory);
router.get('/history/:id', protect, getEntryById);
router.delete('/history/:id', protect, deleteEntry);

export default router;
