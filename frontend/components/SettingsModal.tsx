'use client';

import React from 'react';
import { 
  X, 
  Palette, 
  Type, 
  Layout, 
  Sun, 
  Moon, 
  Laptop, 
  Sliders,
  Check
} from 'lucide-react';

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
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md shadow-2xl p-6 text-[var(--text-primary)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* 1. Appearance Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Palette className="w-3.5 h-3.5" />
              <span>Appearance</span>
            </div>

            {/* Theme selector */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'system', label: 'System', icon: <Laptop className="w-3.5 h-3.5" /> },
                  { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
                  { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
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

            {/* Accent Color selection (clean button presets, no heavy color picker) */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Accent Color
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

          {/* 2. Editor Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Type className="w-3.5 h-3.5" />
              <span>SQL Editor</span>
            </div>

            {/* Font Size Slider and Controls */}
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
                <button
                  onClick={() => onUpdateSettings(s => ({ ...s, fontSize: 13 }))}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Shortcut: <kbd className="font-mono px-1 py-0.2 bg-[var(--bg-header)] rounded border border-[var(--border-subtle)]">Ctrl+Scroll</kbd> or <kbd className="font-mono px-1 py-0.2 bg-[var(--bg-header)] rounded border border-[var(--border-subtle)]">Ctrl + / -</kbd> in editor.
              </p>
            </div>

            {/* Tab Size */}
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

          {/* 3. Workspace Layout Defaults */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Layout className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Sidebar Width: <strong className="text-[var(--text-primary)] font-mono">{Math.round(settings.sidebarWidth)}px</strong></span>
              <button
                onClick={() => onUpdateSettings(s => ({ ...s, sidebarWidth: 260 }))}
                className="text-[11px] text-blue-500 hover:text-blue-400 cursor-pointer"
              >
                Reset to 260px
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Editor Split: <strong className="text-[var(--text-primary)] font-mono">{Math.round(settings.editorHeightPercent)}%</strong></span>
              <button
                onClick={() => onUpdateSettings(s => ({ ...s, editorHeightPercent: 45 }))}
                className="text-[11px] text-blue-500 hover:text-blue-400 cursor-pointer"
              >
                Reset to 45%
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
          <span className="text-[11px] text-[var(--text-muted)]">Preferences saved in browser storage.</span>
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
