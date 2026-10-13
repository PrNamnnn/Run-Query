'use client';

import React, { useEffect, useState } from 'react';
import { Search, Play, Upload, Save, History, Bookmark, RotateCcw, X, Sliders } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onRunQuery: () => void;
  onOpenUpload: () => void;
  onOpenSave: () => void;
  onClearEditor: () => void;
  onViewHistory: () => void;
  onViewSaved: () => void;
  onOpenSettings: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onRunQuery,
  onOpenUpload,
  onOpenSave,
  onClearEditor,
  onViewHistory,
  onViewSaved,
  onOpenSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setSearchTerm('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    {
      id: 'run',
      label: 'Run SQL Query',
      shortcut: 'Ctrl+Enter',
      icon: <Play className="w-3.5 h-3.5 text-blue-500" />,
      action: () => {
        onRunQuery();
        onClose();
      },
    },
    {
      id: 'upload',
      label: 'Upload CSV Dataset',
      shortcut: '',
      icon: <Upload className="w-3.5 h-3.5 text-emerald-500" />,
      action: () => {
        onOpenUpload();
        onClose();
      },
    },
    {
      id: 'save',
      label: 'Save Current Query',
      shortcut: 'Ctrl+S',
      icon: <Save className="w-3.5 h-3.5 text-amber-500" />,
      action: () => {
        onOpenSave();
        onClose();
      },
    },
    {
      id: 'settings',
      label: 'Preferences & Settings',
      shortcut: '',
      icon: <Sliders className="w-3.5 h-3.5 text-blue-400" />,
      action: () => {
        onOpenSettings();
        onClose();
      },
    },
    {
      id: 'history',
      label: 'Open Query History (30 Days)',
      shortcut: '',
      icon: <History className="w-3.5 h-3.5 text-purple-500" />,
      action: () => {
        onViewHistory();
        onClose();
      },
    },
    {
      id: 'saved',
      label: 'View Saved Queries',
      shortcut: '',
      icon: <Bookmark className="w-3.5 h-3.5 text-pink-500" />,
      action: () => {
        onViewSaved();
        onClose();
      },
    },
    {
      id: 'clear',
      label: 'Clear SQL Editor',
      shortcut: '',
      icon: <RotateCcw className="w-3.5 h-3.5 text-slate-400" />,
      action: () => {
        onClearEditor();
        onClose();
      },
    },
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md shadow-2xl overflow-hidden text-[var(--text-primary)]">
        {/* Search Input */}
        <div className="flex items-center px-3.5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-header)]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0 mr-2.5" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Command list */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">
              No matching commands.
            </div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className="w-full flex items-center justify-between px-3 py-2 rounded text-xs hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {cmd.icon}
                  <span>{cmd.label}</span>
                </div>
                {cmd.shortcut && (
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--bg-header)] rounded border border-[var(--border-subtle)] text-[var(--text-muted)]">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
