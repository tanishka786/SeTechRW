import mongoose from 'mongoose';

const uwbDistanceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    tagId: { type: String, required: true },
    primaryId: { type: String, required: true },
    distanceM: { type: Number, required: true },
  },
  { timestamps: true },
);

export const UwbDistance = mongoose.model('UwbDistance', uwbDistanceSchema);
