import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { User, UserRole } from '@/types';
import { Building2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
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
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        throw result.error;
      }
      
      // If redirected, the page will reload and onAuthStateChange will handle it
      if (!result.redirected) {
        // Session was set, the auth state change listener will handle the rest
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  // All users including admins must use Google OAuth for secure authentication

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md shadow-lg border bg-card">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Employee Portal</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in with your @hztech.biz Google account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            className="w-full h-11 font-medium"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Connecting...
              </span>
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
