import { api, setToken } from './client';
import type { AppUser, LoginMethod } from '../types';

export interface PendingPayload {
  identifier: string;
  method: LoginMethod;
  userId: string;
}

export async function loginRequest(method: LoginMethod, identifier: string) {
  return api<{ otp: string; pending: PendingPayload }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ method, identifier }),
  });
}

export async function signupRequest(payload: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}) {
  return api<{ message: string; otp: string; pending: PendingPayload }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyOtpRequest(userId: string, code: string) {
  const data = await api<{ token: string; user: AppUser }>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ userId, code }),
  });
  setToken(data.token);
  return data;
}

export async function resendOtpRequest(userId: string) {
  return api<{ otp: string; pending: PendingPayload }>('/api/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function meRequest() {
  return api<{ user: AppUser }>('/api/auth/me');
}

export async function logoutRequest() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } finally {
    setToken(null);
  }
}
