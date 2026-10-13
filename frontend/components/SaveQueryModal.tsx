'use client';

import React, { useState } from 'react';
import { X, Save, Bookmark } from 'lucide-react';

interface SaveQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onSave: (name: string) => void;
}

export const SaveQueryModal: React.FC<SaveQueryModalProps> = ({
  isOpen,
  onClose,
  query,
  onSave,
}) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md shadow-2xl p-5 text-[var(--text-primary)]">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Save Query</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Query Title
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Revenue by Region"
              required
              className="w-full px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              SQL Preview
            </label>
            <div className="p-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[11px] font-mono text-[var(--text-secondary)] max-h-24 overflow-y-auto whitespace-pre-wrap">
              {query || '(Empty query)'}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[var(--bg-header)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] text-xs rounded transition-colors cursor-pointer border border-[var(--border-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Query</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
