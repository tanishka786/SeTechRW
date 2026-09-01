import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashValue(value: string) {
  return bcrypt.hash(value, 10);
}

export async function verifyHash(value: string, hash: string | null | undefined) {
  if (!hash) return false;
  return bcrypt.compare(value, hash);
}

export function signToken(payload: { userId: string; email: string }) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}

export function isDevOtp(code: string) {
  return code.trim() === env.devOtp;
}
