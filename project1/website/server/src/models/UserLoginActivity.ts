import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userName: { type: String, required: true },
    email: { type: String, required: true },
    forkliftId: { type: String, required: true },
    forkliftName: { type: String, required: true },
    loginTime: { type: String, required: true },
    logoutTime: { type: String, default: null },
    status: { type: String, enum: ['Active', 'Logged Out'], default: 'Active' },
    date: { type: String, required: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const UserLoginActivity = mongoose.model('UserLoginActivity', sessionSchema);
