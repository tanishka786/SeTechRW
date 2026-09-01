import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    time: { type: String, required: true },
    timestamp: { type: Number, required: true },
    type: {
      type: String,
      enum: ['forklift', 'product', 'user', 'bin', 'inventory', 'scan'],
      required: true,
    },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

export const ActivityEvent = mongoose.model('ActivityEvent', eventSchema);
