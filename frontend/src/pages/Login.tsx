import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Shield, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setError('');
    setLoading(true);

    try {
      await login(testEmail, testPassword);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const testAccounts = [
    { email: 'admin@test.com', password: 'admin123', label: 'Admin', icon: Shield, variant: 'destructive' as const },
    { email: 'user@test.com', password: 'user123', label: 'Estimator', icon: User, variant: 'default' as const },
    { email: 'pm@test.com', password: 'pm123', label: 'Preconstruction Manager', icon: Building2, variant: 'secondary' as const },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="GC Legacy Construction" 
              className="h-20 w-auto"
            />
          </div>
          <CardTitle className="text-3xl font-bold">GC Legacy</CardTitle>
          <CardDescription className="text-base">
            Post-Takeoff Estimation & Procurement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="w-full border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground text-center mb-4 uppercase tracking-wider">
              Test Accounts
            </p>
            <div className="space-y-2">
              {testAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <Button
                    key={account.email}
                    type="button"
                    variant={account.variant}
                    className="w-full justify-start"
                    onClick={() => handleQuickLogin(account.email, account.password)}
                    disabled={loading}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    Login as {account.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4 italic">
              Quick login for testing purposes
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}