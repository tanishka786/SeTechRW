import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    livePaused: { type: Boolean, default: false },
    uwbTestCase: { type: String, enum: ['A', 'C'], default: 'C' },
    lastUpdated: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true },
);

export const Settings = mongoose.model('Settings', settingsSchema);
