import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function Settings() {
  const { currentUser } = useAuth();
  const { pushToast } = useToast();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [shift, setShift] = useState('day');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">User Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Update how your name appears in warehouse activity.</p>
        <div className="mt-4 space-y-3">
          <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={currentUser?.email ?? ''} disabled />
          <Input label="Mobile" value={currentUser?.mobile ?? ''} disabled />
          <Select
            label="Default shift"
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            options={[
              { value: 'day', label: 'Day shift' },
              { value: 'night', label: 'Night shift' },
            ]}
          />
          <Button
            onClick={() => {
              window.localStorage.setItem('forklift-settings', JSON.stringify({ name, shift }));
              pushToast('success', 'Profile saved');
            }}
          >
            Save changes
          </Button>
        </div>
      </section>
    </div>
  );
}
