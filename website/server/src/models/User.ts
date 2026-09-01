import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'supervisor', 'operator'], default: 'operator' },
    pendingOtpHash: { type: String, default: null },
    pendingOtpExpires: { type: Date, default: null },
    pendingMethod: { type: String, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
