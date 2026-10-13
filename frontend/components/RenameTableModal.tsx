'use client';

import React, { useState } from 'react';
import { X, Edit3, AlertCircle } from 'lucide-react';

interface RenameTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTableName: string;
  onRename: (oldName: string, newName: string) => Promise<void>;
}

export const RenameTableModal: React.FC<RenameTableModalProps> = ({
  isOpen,
  onClose,
  currentTableName,
  onRename,
}) => {
  const [newName, setNewName] = useState(currentTableName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setNewName(currentTableName);
      setError(null);
    }
  }, [isOpen, currentTableName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = newName.trim();
    if (!sanitized) {
      setError('Table name cannot be empty.');
      return;
    }
    if (sanitized === currentTableName) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onRename(currentTableName, sanitized);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to rename table.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md shadow-2xl p-5 text-[var(--text-primary)]">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rename Table</h3>
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
              Current Name: <span className="font-mono font-medium text-[var(--text-primary)]">{currentTableName}</span>
            </label>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              New Table Name
            </label>
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. orders"
              required
              className="w-full px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {error && (
            <div className="flex items-start gap-1.5 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

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
              disabled={isSubmitting || !newName.trim() || newName.trim() === currentTableName}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <span>{isSubmitting ? 'Renaming...' : 'Rename'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
