import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types';
import { LogIn, Building2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();

    // Listen for auth state changes (for OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleAuthUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleAuthUser(session.user);
      }
    } catch (err) {
      console.error('Session check error:', err);
    } finally {
      setCheckingSession(false);
    }
  };

  const handleAuthUser = async (authUser: any) => {
    const email = authUser.email;
    
    // Check if email is from @hztech.biz domain
    if (!email?.endsWith('@hztech.biz')) {
      setError('Access restricted to @hztech.biz email addresses only.');
      await supabase.auth.signOut();
      setCheckingSession(false);
      return;
    }

    // Look up user in profiles table by email
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      setError('Error checking account. Please try again.');
      await supabase.auth.signOut();
      setCheckingSession(false);
      return;
    }

    if (!profile) {
      setError('Your account has not been created yet. Please contact your administrator.');
      await supabase.auth.signOut();
      setCheckingSession(false);
      return;
    }

    // Update auth_user_id if not set
    if (!profile.auth_user_id) {
      await supabase
        .from('profiles')
        .update({ auth_user_id: authUser.id })
        .eq('id', profile.id);
    }

    onLogin({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role as UserRole,
      department: profile.department,
      phoneNumber: profile.phoneNumber,
      birthday: profile.birthday,
      avatar: profile.avatar,
      auth_user_id: authUser.id,
    });
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            hd: 'hztech.biz', // Restrict to hztech.biz domain
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  // Admin login (for initial setup only)
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // For admin, we check profiles table directly (temporary until proper admin auth is set up)
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', adminEmail)
        .eq('role', 'Admin')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!profile) {
        setError('Admin account not found.');
        setLoading(false);
        return;
      }

      onLogin({
        id: profile.id,
        name: profile.name,
        email: profile.email || adminEmail,
        role: profile.role as UserRole,
        department: profile.department,
        phoneNumber: profile.phoneNumber,
        birthday: profile.birthday,
        avatar: profile.avatar,
      });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-2">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Employee Portal</CardTitle>
          <CardDescription>
            Sign in with your @hztech.biz Google account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!showAdminLogin ? (
            <>
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-12"
                disabled={loading}
              >
                {loading ? (
                  'Connecting...'
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(true)}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Admin Login
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@hztech.biz"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Enter password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Admin Sign In
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminLogin(false);
                    setError('');
                  }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Back to Employee Login
                </button>
              </div>
            </form>
          )}

          <p className="text-xs text-center text-muted-foreground mt-4">
            Employees and HR must sign in using their @hztech.biz Google account.
            Contact your administrator if you don't have access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
