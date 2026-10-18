import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function AdminGate({ children }) {
  const { user } = useAuth();
  if (user?.role === 'admin') return children;
  return (
    <div className="max-w-xl mx-auto px-gutter py-section text-center space-y-4">
      <h1 className="text-3xl">Admins only</h1>
      <p className="text-muted-foreground">{user ? 'Your account does not have access to Diagnostics.' : 'Log in as the app owner to view Diagnostics.'}</p>
      {!user && <Button asChild className="rounded-full"><Link to="/login?returnTo=/diagnostics">Log in</Link></Button>}
    </div>
  );
}