import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

export function Signup() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError((await signup({ name, email, mobile, password, confirmPassword })) ?? '');
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Set up access to Birla Carbon warehouse operations"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-maroon hover:text-brand-red">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Input label="Full Name" name="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" name="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Mobile Number"
          name="mobile"
          inputMode="numeric"
          placeholder="10-digit mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full">
          Create Account
        </Button>
      </form>
    </AuthLayout>
  );
}
