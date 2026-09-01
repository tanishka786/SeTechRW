import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import type { LoginMethod } from '../types';
import { cn } from '../utils/cn';

export function Login() {
  const { startLogin } = useAuth();
  const [method, setMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const message = await startLogin(method, method === 'email' ? email : mobile);
    setError(message ?? '');
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your Birla Carbon warehouse account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-brand-maroon hover:text-brand-red">
            Create Account
          </Link>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        {(['email', 'mobile'] as LoginMethod[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMethod(item);
              setError('');
            }}
            className={cn(
              'rounded-lg py-2 text-sm font-semibold capitalize transition',
              method === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
            )}
          >
            {item === 'email' ? 'Email' : 'Mobile'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {method === 'email' ? (
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
        ) : (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Mobile Number</span>
            <div className="flex gap-2">
              <span className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
                +91
              </span>
            <div className="min-w-0 flex-1">
              <Input
                name="mobile"
                inputMode="numeric"
                placeholder="Enter mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                error={error}
              />
            </div>
            </div>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          Continue
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">
        Demo account: admin@forklift.com · +91 9876543210
      </p>
    </AuthLayout>
  );
}
