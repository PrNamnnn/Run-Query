'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Palette, 
  Type, 
  Layout, 
  Sun, 
  Moon, 
  Laptop, 
  Sliders,
  Check,
  User,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { fetchAccountProfile, deleteAccount } from '@/lib/api';
import { UserProfile } from '@/types';

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  fontSize: number;
  tabSize: number;
  sidebarWidth: number;
  editorHeightPercent: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  currentUser: string | null;
  onLogout: () => void;
}

const ACCENT_PRESETS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentUser,
  onLogout,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchAccountProfile().then(p => {
        if (p) setProfile(p);
      }).catch(() => {});
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') return;
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      onClose();
      onLogout();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg shadow-2xl p-6 text-[var(--text-primary)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Preferences & Account</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* 1. Account Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <User className="w-3.5 h-3.5" />
              <span>User Account</span>
            </div>

            <div className="p-3 bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)] text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Authenticated as:</span>
                <span className="font-mono font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                  {currentUser || profile?.email || 'Authenticated User'}
                </span>
              </div>
              {profile && (
                <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                  <span>Datasets: <strong className="text-[var(--text-primary)] font-mono">{profile.total_tables}</strong></span>
                  <span>Queries executed: <strong className="text-[var(--text-primary)] font-mono">{profile.total_queries}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          {/* 2. Appearance Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Palette className="w-3.5 h-3.5" />
              <span>Appearance</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Color Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dark', label: 'Dark (Black)', icon: <Moon className="w-3.5 h-3.5" /> },
                  { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
                  { id: 'system', label: 'System', icon: <Laptop className="w-3.5 h-3.5" /> },
                ].map(t => {
                  const isActive = settings.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onUpdateSettings(s => ({ ...s, theme: t.id as any }))}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded border text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/15 border-blue-500 text-[var(--text-primary)] font-medium shadow-xs'
                          : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Presets */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Accent Highlight
              </label>
              <div className="flex items-center gap-3">
                {ACCENT_PRESETS.map(preset => {
                  const isSelected = settings.accentColor.toLowerCase() === preset.value.toLowerCase();
                  return (
                    <button
                      key={preset.value}
                      onClick={() => onUpdateSettings(s => ({ ...s, accentColor: preset.value }))}
                      className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs cursor-pointer transition-all border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-panel)]"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: preset.value }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </span>
                      <span className={`text-xs ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          {/* 3. Editor Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Type className="w-3.5 h-3.5" />
              <span>SQL Editor</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Font Size
                </label>
                <span className="text-xs font-mono font-medium text-[var(--text-primary)]">
                  {settings.fontSize} px
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUpdateSettings(s => ({ ...s, fontSize: Math.max(10, s.fontSize - 1) }))}
                  className="px-2 py-0.5 bg-[var(--bg-header)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] rounded border border-[var(--border-subtle)] text-xs font-mono cursor-pointer"
                >
                  -
                </button>
                <input
                  type="range"
                  min="10"
                  max="24"
                  step="1"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
                  className="flex-1 accent-blue-500 cursor-pointer"
                />
                <button
                  onClick={() => onUpdateSettings(s => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) }))}
                  className="px-2 py-0.5 bg-[var(--bg-header)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] rounded border border-[var(--border-subtle)] text-xs font-mono cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Tab Size
              </label>
              <div className="flex gap-2">
                {[2, 4].map(sz => (
                  <button
                    key={sz}
                    onClick={() => onUpdateSettings(s => ({ ...s, tabSize: sz }))}
                    className={`px-3 py-1 text-xs rounded border cursor-pointer font-mono ${
                      settings.tabSize === sz
                        ? 'bg-blue-600/20 border-blue-500 text-[var(--text-primary)] font-semibold'
                        : 'bg-[var(--bg-header)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {sz} spaces
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          {/* 4. Danger Zone / Account Deletion */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Danger Zone</span>
            </div>

            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between p-3 bg-red-500/5 rounded border border-red-500/20 text-xs">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Delete Account</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Permanently delete all tables, datasets, and history.
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs transition-colors cursor-pointer"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="p-3 bg-red-500/10 rounded border border-red-500/30 text-xs space-y-3">
                <div className="font-semibold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Permanent Account Deletion</span>
                </div>
                <p className="text-[11px] text-red-400/90 leading-relaxed">
                  This action cannot be undone. All your PostgreSQL tables, metadata, saved queries, and login identity will be purged immediately.
                </p>
                <div>
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                    Type <strong className="font-mono text-red-400">DELETE</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-2.5 py-1.5 bg-[var(--bg-input)] border border-red-500/40 rounded text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-red-500"
                  />
                </div>

                {deleteError && (
                  <p className="text-[11px] text-red-400">{deleteError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmationText('');
                    }}
                    className="px-2.5 py-1 bg-[var(--bg-panel)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] rounded text-xs cursor-pointer border border-[var(--border-subtle)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmationText !== 'DELETE' || isDeletingAccount}
                    className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeletingAccount ? 'Purging data...' : 'Permanently Delete'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
          <span className="text-[11px] text-[var(--text-muted)]">Preferences saved locally.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
