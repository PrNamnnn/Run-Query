'use client';

import React, { useState } from 'react';
import { 
  Table, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Plus, 
  Bookmark, 
  History, 
  Layers, 
  Database,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Edit2
} from 'lucide-react';
import { TableSchema, SavedQuery, QueryHistoryItem } from '@/types';

interface SidebarProps {
  tables: TableSchema[];
  activeTab: 'datasets' | 'saved' | 'history';
  setActiveTab: (tab: 'datasets' | 'saved' | 'history') => void;
  onOpenUpload: () => void;
  onInsertText: (text: string) => void;
  onDeleteTable: (tableName: string) => void;
  onOpenRenameTable: (tableName: string) => void;
  savedQueries: SavedQuery[];
  onSelectSavedQuery: (q: SavedQuery) => void;
  onDeleteSavedQuery: (id: string) => void;
  history: QueryHistoryItem[];
  onSelectHistoryItem: (h: QueryHistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tables,
  activeTab,
  setActiveTab,
  onOpenUpload,
  onInsertText,
  onDeleteTable,
  onOpenRenameTable,
  savedQueries,
  onSelectSavedQuery,
  onDeleteSavedQuery,
  history,
  onSelectHistoryItem,
  onDeleteHistoryItem,
  onClearHistory,
}) => {
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const getTypeIcon = (typeStr: string) => {
    const t = typeStr.toUpperCase();
    if (t.includes('INT') || t.includes('DOUBLE') || t.includes('FLOAT') || t.includes('DECIMAL')) {
      return <Hash className="w-3 h-3 text-cyan-400 shrink-0" />;
    }
    if (t.includes('DATE') || t.includes('TIME')) {
      return <Calendar className="w-3 h-3 text-amber-400 shrink-0" />;
    }
    if (t.includes('BOOL')) {
      return <ToggleLeft className="w-3 h-3 text-purple-400 shrink-0" />;
    }
    return <Type className="w-3 h-3 text-blue-400 shrink-0" />;
  };

  return (
    <aside className="w-full h-full bg-[var(--bg-sidebar)] flex flex-col select-none shrink-0 overflow-hidden">
      {/* Top Sidebar Navigation Tabs */}
      <div className="flex items-center border-b border-[var(--border-subtle)] px-2 py-1.5 gap-1 bg-[var(--bg-header)] shrink-0">
        <button
          onClick={() => setActiveTab('datasets')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'datasets'
              ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
          }`}
          title="Datasets & Schemas"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tables ({tables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'saved'
              ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
          }`}
          title="Saved Queries"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Saved</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
          }`}
          title="Query History (30 Days)"
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* DATASETS VIEW */}
        {activeTab === 'datasets' && (
          <div>
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Datasets
              </span>
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-400 transition-colors cursor-pointer font-medium"
                title="Upload CSV"
              >
                <Plus className="w-3 h-3" />
                <span>Upload</span>
              </button>
            </div>

            {tables.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
                <Database className="w-6 h-6 mx-auto mb-2 text-[var(--border-strong)]" />
                <p>No tables loaded.</p>
                <button
                  onClick={onOpenUpload}
                  className="mt-3 px-3 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-blue-500 text-xs rounded transition-colors cursor-pointer border border-[var(--border-subtle)]"
                >
                  Import CSV
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {tables.map(tbl => {
                  const isExpanded = expandedTables[tbl.table_name] ?? true;
                  return (
                    <div
                      key={tbl.table_name}
                      className="rounded bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-subtle)] transition-all"
                    >
                      <div className="group flex items-center justify-between px-2 py-1.5 hover:bg-[var(--bg-surface-hover)] rounded cursor-pointer">
                        <div
                          className="flex items-center gap-1.5 flex-1 min-w-0"
                          onClick={() => toggleTable(tbl.table_name)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          )}
                          <Table className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span
                            className="text-xs font-mono font-medium text-[var(--text-primary)] truncate"
                            onDoubleClick={() => onInsertText(tbl.table_name)}
                            title={`Double click to insert '${tbl.table_name}'`}
                          >
                            {tbl.table_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            {tbl.row_count}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRenameTable(tbl.table_name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-blue-400 transition-opacity cursor-pointer"
                            title="Rename Table"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTable(tbl.table_name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-400 transition-opacity cursor-pointer"
                            title="Drop Table"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Columns list */}
                      {isExpanded && (
                        <div className="pl-6 pr-2 py-1 space-y-0.5 border-l border-[var(--border-subtle)] ml-3.5 mb-1">
                          {tbl.columns.map(col => (
                            <div
                              key={col.name}
                              onClick={() => onInsertText(col.name)}
                              className="group/col flex items-center justify-between py-0.5 px-1 rounded hover:bg-[var(--bg-surface-hover)] cursor-pointer text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              title={`Click to insert '${col.name}'`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                {getTypeIcon(col.type)}
                                <span className="truncate">{col.name}</span>
                              </div>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {col.type.toLowerCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SAVED QUERIES VIEW */}
        {activeTab === 'saved' && (
          <div>
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Saved Queries ({savedQueries.length})
              </span>
            </div>

            {savedQueries.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
                <Bookmark className="w-6 h-6 mx-auto mb-2 text-[var(--border-strong)]" />
                <p>No queries saved yet.</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Press Ctrl+S in editor to save.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {savedQueries.map(sq => (
                  <div
                    key={sq.id}
                    onClick={() => onSelectSavedQuery(sq)}
                    className="group flex flex-col p-2 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {sq.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSavedQuery(sq.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-red-400 transition-opacity cursor-pointer"
                        title="Delete query"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-1">
                      {sq.query.replace(/\s+/g, ' ').trim()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUERY HISTORY VIEW (Last 30 Days) */}
        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Last 30 Days ({history.length})
              </span>
              {history.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-[10px] text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
                <History className="w-6 h-6 mx-auto mb-2 text-[var(--border-strong)]" />
                <p>No query history.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {history.map(item => {
                  const dateStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectHistoryItem(item)}
                      className="group flex flex-col p-2 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5 font-mono">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span>{item.execution_time_ms} ms</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistoryItem(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-red-400 transition-opacity cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-[11px] font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate mt-1">
                        {item.query.replace(/\s+/g, ' ').trim()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
