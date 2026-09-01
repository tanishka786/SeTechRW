import { Button } from '../ui/Button';

export function LogoutAction({
  active,
  onLogout,
}: {
  active: boolean;
  onLogout: () => void;
}) {
  if (!active) return <span className="text-xs text-slate-400">Complete</span>;
  return (
    <Button size="sm" variant="outline" onClick={onLogout}>
      Logout
    </Button>
  );
}
