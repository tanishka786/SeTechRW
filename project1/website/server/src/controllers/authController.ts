import type { Request, Response } from 'express';
import { User } from '../models/User';
import { env } from '../config/env';
import { generateOtp, hashValue, isDevOtp, signToken, verifyHash } from '../services/otp';
import { publicUser, type AuthedRequest } from '../middleware/auth';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.slice(-10);
  return /^[6-9]\d{9}$/.test(ten);
}

async function findUser(method: 'email' | 'mobile', identifier: string) {
  if (method === 'email') {
    return User.findOne({ email: identifier.trim().toLowerCase() });
  }
  const mobile = identifier.replace(/\D/g, '').slice(-10);
  return User.findOne({ mobile });
}

export async function signup(req: Request, res: Response) {
  const name = String(req.body.name ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const mobile = String(req.body.mobile ?? '').replace(/\D/g, '').slice(-10);
  const password = String(req.body.password ?? '');
  const confirmPassword = String(req.body.confirmPassword ?? '');

  if (!name) {
    res.status(400).json({ error: 'Please enter your full name' });
    return;
  }
  if (!isEmail(email)) {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }
  if (!isMobile(mobile)) {
    res.status(400).json({ error: 'Please enter a valid mobile number' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match' });
    return;
  }

  const exists = await User.findOne({ $or: [{ email }, { mobile }] });
  if (exists) {
    res.status(409).json({ error: 'An account with this email or mobile already exists' });
    return;
  }

  const otp = generateOtp();
  const user = await User.create({
    id: `usr-${Date.now()}`,
    name,
    email,
    mobile,
    passwordHash: await hashValue(password),
    role: 'operator',
    pendingOtpHash: await hashValue(otp),
    pendingOtpExpires: new Date(Date.now() + 10 * 60_000),
    pendingMethod: 'email',
  });

  res.json({
    message: 'Account created successfully',
    otp,
    pending: { identifier: email, method: 'email', userId: user.id },
  });
}

export async function login(req: Request, res: Response) {
  const method = req.body.method === 'mobile' ? 'mobile' : 'email';
  const identifier = String(req.body.identifier ?? '').trim();
  if (method === 'email' && !isEmail(identifier)) {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }
  if (method === 'mobile' && !isMobile(identifier)) {
    res.status(400).json({ error: 'Please enter a valid mobile number' });
    return;
  }

  const user = await findUser(method, identifier);
  if (!user) {
    res.status(404).json({
      error:
        method === 'email'
          ? 'No account found for this email. Please sign up.'
          : 'No account found for this mobile number. Please sign up.',
    });
    return;
  }

  const otp = generateOtp();
  user.pendingOtpHash = await hashValue(otp);
  user.pendingOtpExpires = new Date(Date.now() + 10 * 60_000);
  user.pendingMethod = method;
  await user.save();

  res.json({
    otp,
    pending: {
      identifier: method === 'email' ? user.email : user.mobile,
      method,
      userId: user.id,
    },
  });
}

export async function verifyOtp(req: Request, res: Response) {
  const userId = String(req.body.userId ?? '');
  const code = String(req.body.code ?? '').trim();
  const user = await User.findOne({ id: userId });
  if (!user || !user.pendingOtpHash) {
    res.status(400).json({ error: 'No verification in progress. Please sign in again.' });
    return;
  }
  if (user.pendingOtpExpires && user.pendingOtpExpires.getTime() < Date.now()) {
    res.status(400).json({ error: 'OTP expired. Please resend the code.' });
    return;
  }
  const valid = isDevOtp(code) || (await verifyHash(code, user.pendingOtpHash));
  if (!valid) {
    res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    return;
  }
  user.pendingOtpHash = null;
  user.pendingOtpExpires = null;
  user.pendingMethod = null;
  await user.save();
  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: publicUser(user) });
}

export async function resendOtp(req: Request, res: Response) {
  const userId = String(req.body.userId ?? '');
  const user = await User.findOne({ id: userId });
  if (!user) {
    res.status(400).json({ error: 'No verification in progress.' });
    return;
  }
  const otp = generateOtp();
  user.pendingOtpHash = await hashValue(otp);
  user.pendingOtpExpires = new Date(Date.now() + 10 * 60_000);
  await user.save();
  res.json({ otp, pending: { identifier: user.email, method: user.pendingMethod ?? 'email', userId: user.id } });
}

export async function me(req: AuthedRequest, res: Response) {
  res.json({ user: req.user });
}

export async function logout(_req: Request, res: Response) {
  res.json({ ok: true });
}

export function health(_req: Request, res: Response) {
  res.json({ ok: true, env: env.port });
}
