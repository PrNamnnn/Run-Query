'use client';

import React, { useState, useRef } from 'react';
import { Download, AlertCircle, Inbox } from 'lucide-react';
import { QueryResult } from '@/types';

interface ResultsTableProps {
  result: QueryResult | null;
  isRunning: boolean;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ result, isRunning }) => {
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingColRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const handleMouseDownResize = (e: React.MouseEvent, colName: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColRef.current = {
      col: colName,
      startX: e.clientX,
      startWidth: currentWidth,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return;
      const deltaX = moveEvent.clientX - resizingColRef.current.startX;
      const newWidth = Math.max(60, resizingColRef.current.startWidth + deltaX);
      setColWidths(prev => ({
        ...prev,
        [resizingColRef.current!.col]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingColRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const exportAsCSV = () => {
    if (!result || !result.columns || !result.rows || result.rows.length === 0) return;

    const escapeVal = (v: any) => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = result.columns.map(escapeVal).join(',');
    const rows = result.rows.map(row => row.map(escapeVal).join(',')).join('\n');
    const csvContent = `${header}\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAsJSON = () => {
    if (!result || !result.columns || !result.rows) return;
    const records = result.rows.map(row => {
      const obj: Record<string, any> = {};
      result.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query_result_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isRunning) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-panel)] text-[var(--text-muted)] gap-2 select-none">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Executing query on PostgreSQL engine...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-panel)] text-[var(--text-muted)] p-6 text-center select-none">
        <Inbox className="w-8 h-8 mb-2 stroke-[1.4]" />
        <p className="text-xs font-medium text-[var(--text-secondary)]">No results to display</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Write a query and press Ctrl+Enter to execute.</p>
      </div>
    );
  }

  if (!result.success || result.error) {
    return (
      <div className="flex-1 overflow-auto bg-[var(--bg-panel)] p-4 font-mono text-xs text-red-400 select-text">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-500/20 text-red-400 font-semibold select-none">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>PostgreSQL Execution Error</span>
        </div>
        <pre className="whitespace-pre-wrap bg-[var(--bg-header)] p-3 rounded border border-red-500/20 text-[11px] leading-relaxed text-red-400">
          {result.error}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-panel)] overflow-hidden">
      {/* Table Sub-header / Export Controls */}
      <div className="flex items-center justify-between px-3 py-1 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--text-primary)]">
            {result.row_count === 0
              ? 'Query executed successfully (0 rows)'
              : result.row_count < result.total_count
              ? `Showing ${result.row_count.toLocaleString()} of ${result.total_count.toLocaleString()}+ rows`
              : `${result.row_count.toLocaleString()} row${result.row_count === 1 ? '' : 's'}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={exportAsCSV}
            className="flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-header)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-[11px] transition-colors cursor-pointer border border-[var(--border-subtle)]"
            title="Export as CSV"
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportAsJSON}
            className="flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-header)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-[11px] transition-colors cursor-pointer border border-[var(--border-subtle)]"
            title="Export as JSON"
          >
            <Download className="w-3 h-3" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left font-mono text-[11px]">
          <thead className="sticky top-0 bg-[var(--bg-header)] z-10 border-b border-[var(--border-strong)] select-none">
            <tr>
              <th className="px-2.5 py-1.5 text-[10px] text-[var(--text-muted)] font-normal border-r border-[var(--border-subtle)] w-12 text-center bg-[var(--bg-header)]">
                #
              </th>
              {result.columns.map((col, idx) => {
                const currentWidth = colWidths[col] || 140;
                return (
                  <th
                    key={idx}
                    style={{ width: `${currentWidth}px`, minWidth: `${currentWidth}px`, maxWidth: `${currentWidth}px` }}
                    className="relative px-3 py-1.5 font-medium text-[var(--text-primary)] border-r border-[var(--border-subtle)] truncate whitespace-nowrap"
                  >
                    <span className="truncate block pr-2">{col}</span>
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, col, currentWidth)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 z-20"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={result.columns.length + 1}
                  className="px-3 py-6 text-center text-[var(--text-muted)] font-sans text-xs"
                >
                  Query returned zero rows.
                </td>
              </tr>
            ) : (
              result.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-[var(--bg-surface-hover)] transition-colors group"
                >
                  <td className="px-2.5 py-1 text-[10px] text-[var(--text-muted)] border-r border-[var(--border-subtle)] text-center select-none bg-[var(--bg-header)]">
                    {rIdx + 1}
                  </td>
                  {row.map((cell, cIdx) => {
                    const colName = result.columns[cIdx];
                    const currentWidth = colWidths[colName] || 140;
                    return (
                      <td
                        key={cIdx}
                        style={{ width: `${currentWidth}px`, minWidth: `${currentWidth}px`, maxWidth: `${currentWidth}px` }}
                        className="px-3 py-1 text-[var(--text-primary)] border-r border-[var(--border-subtle)] whitespace-nowrap truncate select-text"
                      >
                        {cell === null ? (
                          <span className="text-[var(--text-muted)] italic font-sans text-[10px]">NULL</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
