import { Router } from 'express';
import { login, logout, me, resendOtp, signup, verifyOtp } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);
authRouter.post('/verify-otp', verifyOtp);
authRouter.post('/resend-otp', resendOtp);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);
