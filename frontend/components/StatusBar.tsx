'use client';

import React from 'react';
import { Database, Clock, Rows3, CheckCircle2, AlertCircle } from 'lucide-react';
import { QueryResult } from '@/types';

interface StatusBarProps {
  result: QueryResult | null;
  isRunning: boolean;
  totalTables: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ result, isRunning, totalTables }) => {
  return (
    <footer className="h-6 bg-[var(--bg-header)] border-t border-[var(--border-subtle)] px-3 flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono select-none shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-blue-500" />
          <span className="text-[var(--text-secondary)]">DuckDB In-Memory</span>
        </div>
        <span>•</span>
        <span>{totalTables} table{totalTables === 1 ? '' : 's'} loaded</span>
        {isRunning && (
          <>
            <span>•</span>
            <span className="text-blue-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              Executing query...
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {result && (
          <>
            <div className="flex items-center gap-1">
              {result.success ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-red-500" />
              )}
              <span className={result.success ? 'text-emerald-500' : 'text-red-500'}>
                {result.success ? 'Success' : 'Error'}
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <Clock className="w-3 h-3" />
              <span>{result.execution_time_ms} ms</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <Rows3 className="w-3 h-3" />
              <span>{result.row_count} rows</span>
            </div>
          </>
        )}
        {!result && <span>Ready</span>}
      </div>
    </footer>
  );
};
