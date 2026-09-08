import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { DEV_OTP } from '../data/mockData';

export function OTP() {
  const { pendingVerification, verifyOtp, resendOtp } = useAuth();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(30);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  if (!pendingVerification) {
    return <Navigate to="/login" replace />;
  }

  const focusAt = (index: number) => {
    inputs.current[index]?.focus();
    inputs.current[index]?.select();
  };

  const applyCode = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, 6).split('');
    const filled = [...Array(6)].map((_, i) => next[i] ?? '');
    setDigits(filled);
    focusAt(Math.min(next.length, 5));
  };

  const onChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError('');
    if (char && index < 5) focusAt(index + 1);
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusAt(index - 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    applyCode(e.clipboardData.getData('text'));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError((await verifyOtp(digits.join(''))) ?? '');
  };

  const onResend = async () => {
    if (seconds > 0) return;
    setError((await resendOtp()) ?? '');
    setSeconds(30);
    setDigits(['', '', '', '', '', '']);
    focusAt(0);
  };

  return (
    <AuthLayout
      title="Verify your account"
      subtitle={`We've sent a verification code to: ${pendingVerification.identifier}`}
      footer={
        <Link to="/login" className="font-semibold text-brand-maroon">
          Use a different account
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              value={digit}
              onChange={(e) => onChange(index, e.target.value)}
              onKeyDown={(e) => onKeyDown(index, e)}
              onPaste={onPaste}
              inputMode="numeric"
              maxLength={1}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              aria-label={`Digit ${index + 1}`}
              className="h-12 w-10 rounded-xl border border-slate-200 text-center text-lg font-semibold outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15 sm:h-14 sm:w-12"
            />
          ))}
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full">
          Verify OTP
        </Button>
        <p className="text-center text-sm text-slate-500">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={onResend}
            disabled={seconds > 0}
            className="font-semibold text-brand-maroon disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Resend OTP{seconds > 0 ? ` (${seconds}s)` : ''}
          </button>
        </p>
        <p className="rounded-xl bg-brand-yellow/25 px-3 py-2 text-center text-xs text-brand-maroon">
          Development OTP {DEV_OTP} is always accepted. Your generated code is also valid.
        </p>
      </form>
    </AuthLayout>
  );
}
