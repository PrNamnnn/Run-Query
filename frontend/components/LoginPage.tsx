'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  Database 
} from 'lucide-react';
import { getSupabase, isSupabaseConfigured, getAuthRedirectUrl } from '@/lib/supabase';
import { RunQueryLogo } from './RunQueryLogo';

interface LoginPageProps {
  onLoginSuccess: (email: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot_password' | 'reset_password';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If arriving with recovery hash/query on login page, redirect to dedicated /reset-password
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      if (hash.includes('type=recovery') || search.includes('type=recovery') || search.includes('token_hash=')) {
        window.location.href = `/reset-password${search || hash}`;
        return;
      }

      // Check if arriving from signup email confirmation
      if (hash.includes('type=signup') || search.includes('type=signup') || search.includes('confirmation_token=')) {
        setSuccessMessage('Email confirmed successfully! You can now sign in.');
      }

      // Check if Supabase passed an auth error (e.g. expired confirmation or recovery link)
      const params = new URLSearchParams(search || (hash.startsWith('#') ? hash.substring(1) : hash));
      const errorDescription = params.get('error_description');
      if (errorDescription) {
        setErrorMessage(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        onLoginSuccess(data.user.email || email);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabase();
      const redirectUrl = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // Automatically signed in (email confirmation disabled or auto-confirmed)
        onLoginSuccess(data.user?.email || email);
      } else if (data.user) {
        // Confirmation email required
        setSuccessMessage('Registration successful! Please check your email to confirm your account, then sign in.');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabase();
      const redirectUrl = getAuthRedirectUrl('/reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('Password recovery email sent. Check your inbox for the secure reset link.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send recovery email. Please check the address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('Password updated successfully. You can now sign in with your new password.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      // Clean hash from URL
      if (typeof window !== 'undefined' && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Recovery link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col justify-center items-center bg-[var(--bg-app)] text-[var(--text-primary)] px-4 select-none">
      <div className="w-full max-w-sm z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-7">
          <div className="mb-3.5 shadow-sm">
            <RunQueryLogo size={42} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Run Query
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 text-center">
            PostgreSQL Analytical SQL Practice Platform
          </p>
        </div>

        {/* Configuration Notice if Supabase keys missing */}
        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-[11px] text-amber-400">
            <p className="font-medium mb-1">Configuration Needed</p>
            <p className="text-amber-400/80 leading-relaxed">
              Configure <code className="font-mono text-amber-300">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="font-mono text-amber-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your environment file.
            </p>
          </div>
        )}

        {/* Status Messages */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-start gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-6 shadow-2xl">
          {/* 1. LOGIN MODE */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="analyst@example.com"
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setMode('forgot_password');
                    }}
                    className="text-[11px] text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 pr-9 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign in to Run Query</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('signup');
                  }}
                  className="text-blue-500 hover:text-blue-400 font-medium transition-colors cursor-pointer"
                >
                  Create account
                </button>
              </div>
            </form>
          )}

          {/* 2. SIGNUP MODE */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="analyst@example.com"
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 pr-9 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSubmitting ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('login');
                  }}
                  className="text-blue-500 hover:text-blue-400 font-medium transition-colors cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD MODE */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  Reset Password
                </h3>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Enter your registered email address and Supabase Auth will send a secure password recovery link.
              </p>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="analyst@example.com"
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Sending link...' : 'Send Recovery Link'}
              </button>

              <div className="pt-3 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('login');
                  }}
                  className="text-blue-500 hover:text-blue-400 font-medium transition-colors cursor-pointer"
                >
                  Return to sign in
                </button>
              </div>
            </form>
          )}

          {/* 4. SET NEW PASSWORD MODE (From recovery email link) */}
          {mode === 'reset_password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  Set New Password
                </h3>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Your recovery link has been verified. Enter your new password below.
              </p>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Updating password...' : 'Update Password & Continue'}
              </button>
            </form>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 flex items-center justify-center gap-5 text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            <span>Supabase PostgreSQL</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Schema Isolation</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
          <div>Read-Only Practice</div>
        </div>
      </div>
    </div>
  );
};
