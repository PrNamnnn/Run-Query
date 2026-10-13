'use client';

import React, { useState } from 'react';
import { Database, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (email: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('developer@local.workspace');
  const [password, setPassword] = useState('••••••••••••');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onLoginSuccess(email || 'developer@local.workspace');
      setIsSubmitting(false);
    }, 400);
  };

  const handleQuickDemo = () => {
    onLoginSuccess('analyst@sql-workspace.dev');
  };

  return (
    <div className="flex min-h-screen w-full flex-col justify-center items-center bg-[var(--bg-app)] text-[var(--text-primary)] px-4">
      {/* Subtle background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-sm z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-10 w-10 rounded-md bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center text-blue-500 mb-4 shadow-sm">
            <Database className="w-5 h-5 stroke-[1.8]" />
          </div>
          <h1 className="text-xl font-medium tracking-tight text-[var(--text-primary)]">SQL Workspace</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 text-center">
            Local-first analytical SQL engine powered by DuckDB.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md p-6 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Local Passkey
                </label>
                <span className="text-[11px] text-[var(--text-muted)]">Local-only</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <span>Entering workspace...</span>
              ) : (
                <>
                  <span>Sign in to Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero-cloud telemetry</span>
            </span>
            <button
              onClick={handleQuickDemo}
              className="text-blue-500 hover:text-blue-400 transition-colors font-medium cursor-pointer"
            >
              Skip as Analyst
            </button>
          </div>
        </div>

        {/* Feature badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Fast In-Memory DuckDB</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
          <div>SSMS / T-SQL Dialect</div>
          <div className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
          <div>Offline IndexedDB</div>
        </div>
      </div>
    </div>
  );
};
