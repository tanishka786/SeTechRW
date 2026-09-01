import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppUser, LoginMethod } from '../types';
import { loginRequest, logoutRequest, meRequest, resendOtpRequest, signupRequest, verifyOtpRequest } from '../api/auth';
import { ApiError, getToken, setToken } from '../api/client';
import { useToast } from './ToastContext';

export interface PendingVerification {
  identifier: string;
  method: LoginMethod;
  userId: string;
}

interface SignupPayload {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}

interface AuthContextValue {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  pendingVerification: PendingVerification | null;
  startLogin: (method: LoginMethod, identifier: string) => Promise<string | null>;
  signup: (payload: SignupPayload) => Promise<string | null>;
  verifyOtp: (code: string) => Promise<string | null>;
  resendOtp: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const PENDING_KEY = 'forklift-pending';
const AuthContext = createContext<AuthContextValue | null>(null);

function readPending(): PendingVerification | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingVerification) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [pendingVerification, setPending] = useState<PendingVerification | null>(readPending);
  const [ready, setReady] = useState(!getToken());
  const { pushToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    meRequest()
      .then((data) => setCurrentUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const savePending = (pending: PendingVerification | null) => {
    setPending(pending);
    if (pending) window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else window.sessionStorage.removeItem(PENDING_KEY);
  };

  const startLogin = useCallback(
    async (method: LoginMethod, identifier: string) => {
      try {
        const data = await loginRequest(method, identifier);
        savePending(data.pending);
        pushToast('info', `Your test OTP is: ${data.otp}`);
        navigate('/otp');
        return null;
      } catch (error) {
        return error instanceof ApiError ? error.message : 'Unable to reach the warehouse database. Please try again.';
      }
    },
    [navigate, pushToast],
  );

  const signup = useCallback(
    async (payload: SignupPayload) => {
      try {
        const data = await signupRequest(payload);
        savePending(data.pending);
        pushToast('success', 'Account created successfully');
        pushToast('info', `Your test OTP is: ${data.otp}`);
        navigate('/otp');
        return null;
      } catch (error) {
        return error instanceof ApiError ? error.message : 'Unable to reach the warehouse database. Please try again.';
      }
    },
    [navigate, pushToast],
  );

  const verifyOtp = useCallback(
    async (code: string) => {
      if (!pendingVerification) return 'No verification in progress. Please sign in again.';
      try {
        const data = await verifyOtpRequest(pendingVerification.userId, code);
        savePending(null);
        setCurrentUser(data.user);
        pushToast('success', 'OTP verified');
        pushToast('success', 'Login successful');
        navigate('/');
        return null;
      } catch (error) {
        return error instanceof ApiError ? error.message : 'Invalid OTP. Please try again.';
      }
    },
    [navigate, pendingVerification, pushToast],
  );

  const resendOtp = useCallback(async () => {
    if (!pendingVerification) return 'No verification in progress.';
    try {
      const data = await resendOtpRequest(pendingVerification.userId);
      savePending(data.pending);
      pushToast('info', `Your test OTP is: ${data.otp}`);
      return null;
    } catch (error) {
      return error instanceof ApiError ? error.message : 'Unable to resend OTP.';
    }
  }, [pendingVerification, pushToast]);

  const logout = useCallback(async () => {
    await logoutRequest();
    setCurrentUser(null);
    savePending(null);
    pushToast('info', 'Logged out');
    navigate('/login');
  }, [navigate, pushToast]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      pendingVerification,
      startLogin,
      signup,
      verifyOtp,
      resendOtp,
      logout,
    }),
    [currentUser, pendingVerification, startLogin, signup, verifyOtp, resendOtp, logout],
  );

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf6ee] text-sm text-slate-500">
        Connecting to Birla Carbon...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
