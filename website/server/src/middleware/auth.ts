import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    mobile: string;
    role: string;
  };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Sign in required' });
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string; email: string };
    const user = await User.findOne({ id: payload.userId });
    if (!user) {
      res.status(401).json({ error: 'Account not found' });
      return;
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

export function publicUser(user: { id: string; name: string; email: string; mobile: string; role: string; createdAt?: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}
