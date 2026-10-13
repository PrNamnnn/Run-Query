'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LoginPage } from '@/components/LoginPage';
import { Sidebar } from '@/components/Sidebar';
import { QueryEditor } from '@/components/QueryEditor';
import { ResultsTable } from '@/components/ResultsTable';
import { StatusBar } from '@/components/StatusBar';
import { UploadModal } from '@/components/UploadModal';
import { SaveQueryModal } from '@/components/SaveQueryModal';
import { CommandPalette } from '@/components/CommandPalette';
import { SettingsModal, AppSettings } from '@/components/SettingsModal';
import { RenameTableModal } from '@/components/RenameTableModal';
import { executeSqlQuery, fetchSchema, deleteTable, renameTable, uploadCsvFiles } from '@/lib/api';
import { 
  addQueryHistory, 
  getAllHistory, 
  deleteHistoryItem, 
  clearAllHistory,
  saveQueryToIDB, 
  getAllSavedQueries, 
  deleteSavedQuery,
  getAllDatasetsFromIDB,
  removeDatasetFromIDB,
  renameDatasetInIDB
} from '@/lib/db';
import { TableSchema, QueryResult, QueryHistoryItem, SavedQuery } from '@/types';
import { 
  Database, 
  Upload, 
  Search, 
  LogOut, 
  PanelLeftClose,
  PanelLeftOpen,
  Sliders
} from 'lucide-react';

const DEFAULT_SQL = `-- SQL Workspace
-- Select all orders or write your analytical queries
SELECT 
    region, 
    COUNT(*) AS total_orders,
    ROUND(SUM(total_amount), 2) AS total_revenue
FROM orders
GROUP BY region
ORDER BY total_revenue DESC;`;

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#3b82f6',
  fontSize: 13,
  tabSize: 2,
  sidebarWidth: 260,
  editorHeightPercent: 45,
};

export default function Home() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // App Settings state with localStorage persistence
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Resolved theme state (for passing to Monaco vs vs-dark)
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('dark');

  // App UI state
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [activeTab, setActiveTab] = useState<'datasets' | 'saved' | 'history'>('datasets');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [renameTargetTable, setRenameTargetTable] = useState<string | null>(null);

  // Query and execution state (explicit single source of truth)
  const [sqlQuery, setSqlQuery] = useState(DEFAULT_SQL);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Ref mirror for sqlQuery and isRunning to prevent any stale closure issues
  const sqlQueryRef = useRef(sqlQuery);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    sqlQueryRef.current = sqlQuery;
  }, [sqlQuery]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Local-first persistent state
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  // Split-pane and sidebar resizing refs
  const isResizingSplitRef = useRef(false);
  const isResizingSidebarRef = useRef(false);

  // 1. Load user session and settings from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('sql_workspace_user');
    if (savedUser) {
      setCurrentUser(savedUser);
    }

    try {
      const savedSettings = localStorage.getItem('sql_workspace_settings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch {
      // Ignore corrupted settings
    }

    setIsAuthChecking(false);
  }, []);

  // 2. Persist settings and apply CSS theme / variables
  useEffect(() => {
    try {
      localStorage.setItem('sql_workspace_settings', JSON.stringify(settings));
    } catch {}

    // Resolve system theme if applicable
    let resolvedTheme: 'dark' | 'light' = 'dark';
    if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = prefersDark ? 'dark' : 'light';
    } else if (settings.theme === 'light') {
      resolvedTheme = 'light';
    } else {
      resolvedTheme = 'dark';
    }

    setEffectiveTheme(resolvedTheme);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.setProperty('--accent', settings.accentColor);
  }, [settings]);

  // Listen to OS prefers-color-scheme if theme is set to 'system'
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setEffectiveTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  // Restore stored datasets and backend tables on startup
  const refreshSchemaAndRestore = useCallback(async () => {
    try {
      const schemaData = await fetchSchema();
      let currentTables: TableSchema[] = schemaData.tables || [];

      // If backend is empty (e.g. backend restarted), restore from IndexedDB
      if (currentTables.length === 0) {
        const storedDatasets = await getAllDatasetsFromIDB();
        if (storedDatasets.length > 0) {
          const filesToRestore: File[] = storedDatasets.map(ds => {
            return new File([ds.content], `${ds.table_name}.csv`, { type: 'text/csv' });
          });
          const uploadRes = await uploadCsvFiles(filesToRestore);
          currentTables = uploadRes.map((r: any) => ({
            table_name: r.table_name,
            row_count: r.row_count,
            columns: r.columns,
          }));
        }
      }

      setTables(currentTables);
    } catch (err) {
      console.error('Failed to sync tables:', err);
    }
  }, []);

  // Load saved queries and history from IndexedDB
  const refreshLocalData = useCallback(async () => {
    try {
      const [hist, saved] = await Promise.all([
        getAllHistory(),
        getAllSavedQueries(),
      ]);
      setHistory(hist);
      setSavedQueries(saved);
    } catch (err) {
      console.error('Failed to load local history or saved queries:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshSchemaAndRestore();
      refreshLocalData();
    }
  }, [currentUser, refreshSchemaAndRestore, refreshLocalData]);

  // Unified Query Execution Pipeline (Single Source of Truth)
  const handleExecute = useCallback(async () => {
    const queryToRun = sqlQueryRef.current.trim();
    if (!queryToRun || isRunningRef.current) return;

    setIsRunning(true);
    isRunningRef.current = true;
    const startTs = Date.now();

    try {
      const res = await executeSqlQuery(queryToRun);
      
      setQueryResult({
        success: Boolean(res.success),
        columns: res.columns || [],
        rows: res.rows || [],
        row_count: res.row_count ?? 0,
        total_count: res.total_count ?? (res.rows ? res.rows.length : 0),
        execution_time_ms: res.execution_time_ms ?? 0,
        error: res.error || null,
        translated_query: res.translated_query || null,
      });

      // Record into 30-day history
      const historyItem: QueryHistoryItem = {
        id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        query: queryToRun,
        timestamp: Date.now(),
        execution_time_ms: res.execution_time_ms ?? 0,
        status: res.success ? 'success' : 'error',
        row_count: res.row_count ?? 0,
        error: res.error,
      };

      await addQueryHistory(historyItem);
      await refreshLocalData();
    } catch (err: any) {
      const duration = Date.now() - startTs;
      const failedResult: QueryResult = {
        success: false,
        columns: [],
        rows: [],
        row_count: 0,
        total_count: 0,
        execution_time_ms: duration,
        error: err.message || 'Unknown network or query execution error.',
      };
      setQueryResult(failedResult);

      const historyItem: QueryHistoryItem = {
        id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        query: queryToRun,
        timestamp: Date.now(),
        execution_time_ms: duration,
        status: 'error',
        row_count: 0,
        error: failedResult.error,
      };
      await addQueryHistory(historyItem);
      await refreshLocalData();
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
    }
  }, [refreshLocalData]);

  // Global Keyboard listener for Ctrl/Cmd shortcuts outside editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsSaveModalOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExecute]);

  // Handle Login
  const handleLoginSuccess = (email: string) => {
    localStorage.setItem('sql_workspace_user', email);
    setCurrentUser(email);
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('sql_workspace_user');
    setCurrentUser(null);
  };

  // Insert column / table identifier into editor
  const handleInsertText = (text: string) => {
    setSqlQuery(prev => prev + ` ${text} `);
  };

  // Drop table
  const handleDeleteTable = async (tableName: string) => {
    if (!confirm(`Are you sure you want to drop table '${tableName}'?`)) return;
    try {
      await deleteTable(tableName);
      await removeDatasetFromIDB(tableName);
      await refreshSchemaAndRestore();
    } catch (err: any) {
      alert(`Could not drop table: ${err.message}`);
    }
  };

  // Rename table handler
  const handleRenameTable = async (oldName: string, newName: string) => {
    try {
      const res = await renameTable(oldName, newName);
      const canonicalOld = res.old_name || oldName;
      const canonicalNew = res.new_name || newName;
      await renameDatasetInIDB(canonicalOld, canonicalNew);
      await refreshSchemaAndRestore();
    } catch (err: any) {
      alert(`Could not rename table: ${err.message}`);
    }
  };

  // Save Query
  const handleSaveQuery = async (name: string) => {
    const newSaved: SavedQuery = {
      id: `sq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      query: sqlQueryRef.current,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await saveQueryToIDB(newSaved);
    await refreshLocalData();
  };

  // Delete saved query
  const handleDeleteSavedQuery = async (id: string) => {
    await deleteSavedQuery(id);
    await refreshLocalData();
  };

  // Delete history item
  const handleDeleteHistoryItem = async (id: string) => {
    await deleteHistoryItem(id);
    await refreshLocalData();
  };

  // Clear all history
  const handleClearHistory = async () => {
    if (!confirm('Clear all query history for the last 30 days?')) return;
    await clearAllHistory();
    await refreshLocalData();
  };

  // 1. Resizing Editor / Results Split Pane via single flex-basis source of truth
  const handleMouseDownSplitResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSplitRef.current = true;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingSplitRef.current) return;
      const container = document.getElementById('workspace-center-panel');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newPercent = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      // Clamp between 15% and 85% to ensure minimum heights
      if (newPercent >= 15 && newPercent <= 85) {
        setSettings(s => ({ ...s, editorHeightPercent: newPercent }));
      }
    };

    const onMouseUp = () => {
      isResizingSplitRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // 2. Resizing Sidebar Width
  const handleMouseDownSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSidebarRef.current = true;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingSidebarRef.current) return;
      const newWidth = Math.min(450, Math.max(220, moveEvent.clientX));
      setSettings(s => ({ ...s, sidebarWidth: newWidth }));
    };

    const onMouseUp = () => {
      isResizingSidebarRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-app)] text-[var(--text-muted)]">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden select-none">
      {/* TOP HEADER */}
      <header className="h-10 bg-[var(--bg-header)] border-b border-[var(--border-subtle)] px-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Database className="w-3 h-3 stroke-[2]" />
            </div>
            <span className="text-xs font-semibold tracking-tight text-[var(--text-primary)]">
              SQL Workspace
            </span>
          </div>

          <div className="h-3.5 w-px bg-[var(--border-subtle)]" />

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs rounded transition-colors cursor-pointer border border-[var(--border-subtle)]"
          >
            <Upload className="w-3 h-3 text-blue-500" />
            <span>Upload CSV</span>
          </button>
        </div>

        {/* Center / Search bar & command shortcut */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer w-48 sm:w-64"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left truncate">Search or run...</span>
            <kbd className="text-[10px] font-mono px-1 py-0.2 bg-[var(--bg-header)] rounded border border-[var(--border-subtle)] text-[var(--text-muted)]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right user & Settings & logout */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title="Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono text-[var(--text-muted)] hidden md:inline truncate max-w-[150px]">
            {currentUser}
          </span>

          <button
            onClick={handleLogout}
            className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* RESIZABLE SIDEBAR */}
        {isSidebarOpen && (
          <div
            style={{ width: `${settings.sidebarWidth}px` }}
            className="relative h-full shrink-0 flex overflow-hidden border-r border-[var(--border-subtle)]"
          >
            <Sidebar
              tables={tables}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenUpload={() => setIsUploadOpen(true)}
              onInsertText={handleInsertText}
              onDeleteTable={handleDeleteTable}
              onOpenRenameTable={(t) => setRenameTargetTable(t)}
              savedQueries={savedQueries}
              onSelectSavedQuery={(sq) => setSqlQuery(sq.query)}
              onDeleteSavedQuery={handleDeleteSavedQuery}
              history={history}
              onSelectHistoryItem={(h) => setSqlQuery(h.query)}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onClearHistory={handleClearHistory}
            />

            {/* Sidebar Right Resize Drag Handle */}
            <div
              onMouseDown={handleMouseDownSidebarResize}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/60 active:bg-blue-500 z-10 transition-colors"
            />
          </div>
        )}

        {/* CENTER PANE: PROPER VERTICAL FLEX LAYOUT (NO Z-INDEX OVERLAPS) */}
        <div id="workspace-center-panel" className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
          {/* Top: SQL Editor (Occupies exact flex-basis without absolute breakout) */}
          <div 
            style={{ flex: `0 0 ${settings.editorHeightPercent}%` }} 
            className="min-h-[120px] overflow-hidden"
          >
            <QueryEditor
              value={sqlQuery}
              onChange={setSqlQuery}
              onExecute={handleExecute}
              onSave={() => setIsSaveModalOpen(true)}
              isRunning={isRunning}
              fontSize={settings.fontSize}
              tabSize={settings.tabSize}
              theme={effectiveTheme}
              onFontSizeChange={(newSize) => setSettings(s => ({ ...s, fontSize: newSize }))}
            />
          </div>

          {/* Split Pane Horizontal Resizer (Real DOM node between panels) */}
          <div
            onMouseDown={handleMouseDownSplitResize}
            className="h-2 bg-[var(--bg-surface)] hover:bg-blue-500/70 active:bg-blue-600 cursor-row-resize border-y border-[var(--border-subtle)] transition-colors flex items-center justify-center shrink-0 group select-none"
          >
            <div className="w-10 h-0.5 rounded-full bg-[var(--border-strong)] group-hover:bg-white transition-colors" />
          </div>

          {/* Bottom: Query Results (Takes flex-1 remaining space, scrolls internally) */}
          <div className="flex-1 min-h-[120px] overflow-hidden flex flex-col">
            <ResultsTable result={queryResult} isRunning={isRunning} />
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <StatusBar
        result={queryResult}
        isRunning={isRunning}
        totalTables={tables.length}
      />

      {/* MODALS */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          refreshSchemaAndRestore();
        }}
      />

      <SaveQueryModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        query={sqlQuery}
        onSave={handleSaveQuery}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {renameTargetTable && (
        <RenameTableModal
          isOpen={Boolean(renameTargetTable)}
          currentTableName={renameTargetTable}
          onClose={() => setRenameTargetTable(null)}
          onRename={handleRenameTable}
        />
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onRunQuery={handleExecute}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenSave={() => setIsSaveModalOpen(true)}
        onClearEditor={() => setSqlQuery('')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onViewHistory={() => {
          setIsSidebarOpen(true);
          setActiveTab('history');
        }}
        onViewSaved={() => {
          setIsSidebarOpen(true);
          setActiveTab('saved');
        }}
      />
    </div>
  );
}
