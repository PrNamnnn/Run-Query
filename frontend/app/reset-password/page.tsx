'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  ShieldAlert 
} from 'lucide-react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { RunQueryLogo } from '@/components/RunQueryLogo';

export default function ResetPasswordPage() {
  const [isValidating, setIsValidating] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();

    const parseAndValidateSession = async () => {
      if (typeof window === 'undefined') return;

      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const searchParams = new URLSearchParams(search);

      // 1. Check for explicit error parameters returned by Supabase
      // e.g. #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const errorParam = hashParams.get('error') || searchParams.get('error');
      const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');

      if (errorParam || errorDesc) {
        if (isMounted) {
          setSessionError(
            errorDesc?.replace(/\+/g, ' ') || 
            'This password reset link is invalid or has expired. Please request a new recovery email.'
          );
          setIsValidating(false);
        }
        return;
      }

      // 2. Handle PKCE code exchange if present in query parameters (?code=...)
      const code = searchParams.get('code');
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (isMounted) {
              setSessionError(error.message || 'Invalid or expired recovery code.');
              setIsValidating(false);
            }
            return;
          }
          if (isMounted) {
            setIsSessionValid(true);
            setIsValidating(false);
          }
          return;
        } catch (err: any) {
          if (isMounted) {
            setSessionError(err.message || 'Failed to exchange recovery code.');
            setIsValidating(false);
          }
          return;
        }
      }

      // 3. Handle Token Hash if present (?token_hash=...&type=recovery)
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type') || hashParams.get('type');
      if (tokenHash && type === 'recovery') {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (error) {
            if (isMounted) {
              setSessionError(error.message || 'Invalid or expired recovery token.');
              setIsValidating(false);
            }
            return;
          }
          if (isMounted) {
            setIsSessionValid(true);
            setIsValidating(false);
          }
          return;
        } catch (err: any) {
          if (isMounted) {
            setSessionError(err.message || 'Failed to verify recovery token.');
            setIsValidating(false);
          }
          return;
        }
      }

      // 4. Check for active recovery session or hash tokens
      const { data: { session } } = await supabase.auth.getSession();
      const hasRecoveryHash = hash.includes('type=recovery');

      if (session || hasRecoveryHash) {
        if (isMounted) {
          setIsSessionValid(true);
          setIsValidating(false);
        }
        return;
      }

      // 5. If no session or tokens exist, this is an unauthorized direct visit
      // Give a brief delay for any background hash parsing by Supabase client
      setTimeout(async () => {
        if (!isMounted) return;
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          setIsSessionValid(true);
          setIsValidating(false);
        } else {
          setSessionError('No active recovery session found. Please request a password reset email first.');
          setIsValidating(false);
        }
      }, 500);
    };

    // Listen to onAuthStateChange for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && isMounted)) {
        setIsSessionValid(true);
        setIsValidating(false);
        setSessionError(null);
      }
    });

    parseAndValidateSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Password validation: minimum 6 characters
    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      // Sign out from the temporary recovery session so the user signs in cleanly with new password
      await supabase.auth.signOut();

      // Clear any tokens in URL bar
      if (typeof window !== 'undefined' && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to update password. Your recovery link may have expired.');
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
            Password Recovery
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-6 shadow-2xl">
          {/* 1. VALIDATING SESSION STATE */}
          {isValidating && (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2.5">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Verifying recovery session...
              </p>
            </div>
          )}

          {/* 2. INVALID / EXPIRED SESSION STATE */}
          {!isValidating && (!isSessionValid || sessionError) && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {sessionError || 'Invalid or expired recovery link.'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Password recovery links are single-use and expire quickly. To reset your password, please request a new link.
              </p>
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded transition-colors shadow-sm cursor-pointer"
              >
                <span>Request New Reset Link</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* 3. SUCCESS STATE */}
          {!isValidating && isSuccess && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Password updated successfully! You can now sign in with your new credentials.
                </span>
              </div>
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-medium rounded transition-colors shadow-sm cursor-pointer"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* 4. ACTIVE FORM: SET NEW PASSWORD */}
          {!isValidating && isSessionValid && !isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  Set New Password
                </h3>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Your recovery session has been verified. Enter your new password below.
              </p>

              {submitError && (
                <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{submitError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  New Password
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
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSubmitting ? (
                  <span>Updating password...</span>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                <Link
                  href="/"
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Cancel and return to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
