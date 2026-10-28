'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { uploadCsvFiles } from '@/lib/api';
import { TableSchema } from '@/types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (tables: TableSchema[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (fileArray.length === 0) {
      setErrorMessage('Please select valid .csv files.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const result = await uploadCsvFiles(fileArray);

      const tableSchemas: TableSchema[] = result.map((r: any) => ({
        table_name: r.table_name,
        display_name: r.table_name,
        row_count: r.row_count,
        columns: r.columns,
      }));

      setSuccessInfo(`Successfully imported ${tableSchemas.length} dataset(s) into PostgreSQL!`);
      setTimeout(() => {
        onUploadSuccess(tableSchemas);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload and parse CSV.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg shadow-2xl p-6 text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Import CSV Dataset</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Tables are stored in your isolated PostgreSQL schema.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-5 border border-dashed rounded-md p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-[var(--border-strong)] hover:border-blue-500 bg-[var(--bg-panel)]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            multiple
            accept=".csv"
            className="hidden"
          />

          <div className="h-10 w-10 rounded-full bg-[var(--bg-header)] border border-[var(--border-subtle)] flex items-center justify-center text-blue-500 mb-3 shadow-xs">
            <UploadCloud className="w-5 h-5 stroke-[1.8]" />
          </div>

          <div className="text-xs font-medium text-[var(--text-primary)] mb-1">
            Click to upload or drag & drop CSVs
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Single or multi-file supported (e.g. orders.csv, customers.csv)
          </div>
        </div>

        {/* Status display */}
        {isUploading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-500 py-2 bg-blue-500/10 rounded border border-blue-500/20">
            <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Parsing schema & inserting into PostgreSQL...</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 flex items-start gap-2 text-xs text-red-400 p-2.5 bg-red-500/10 rounded border border-red-500/20">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successInfo && (
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 p-2.5 bg-emerald-500/10 rounded border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>PostgreSQL Schema-Isolated</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[var(--bg-header)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] rounded text-xs transition-colors cursor-pointer border border-[var(--border-subtle)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
