import mongoose from 'mongoose';

const uwbRangeSchema = new mongoose.Schema(
  {
    pairKey: { type: String, required: true, unique: true },
    fromId: { type: String, required: true },
    toId: { type: String, required: true },
    distanceMm: { type: Number, required: true },
    quality: { type: Number, default: 95 },
    source: { type: String, enum: ['dummy', 'dwm3001c'], default: 'dummy' },
    measuredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const UwbRange = mongoose.model('UwbRange', uwbRangeSchema);
