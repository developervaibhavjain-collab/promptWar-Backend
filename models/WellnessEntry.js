import mongoose from 'mongoose';

const WellnessEntrySchema = new mongoose.Schema({
  mood: {
    type: String,
    required: true,
  },
  stressLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  sleepHours: {
    type: Number,
    required: true,
  },
  studyHours: {
    type: Number,
    required: true,
  },
  concern: {
    type: String,
    required: true,
    enum: [
      'Exam Pressure',
      'Result Anxiety',
      'Family Pressure',
      'Time Management',
      'Burnout',
      'Other',
    ],
  },
  wellnessScore: {
    type: Number,
    required: true,
  },
  burnoutRisk: {
    type: String,
    required: true,
  },
  advice: {
    type: String,
    required: true,
  },
  dailyPlan: {
    type: String,
    required: true,
  },
  motivation: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const WellnessEntry = mongoose.model('WellnessEntry', WellnessEntrySchema);

export default WellnessEntry;
