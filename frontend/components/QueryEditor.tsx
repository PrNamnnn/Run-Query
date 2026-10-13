'use client';

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Play, Save, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  onSave: () => void;
  isRunning: boolean;
  fontSize: number;
  tabSize: number;
  theme: string;
  onFontSizeChange: (newSize: number) => void;
}

export const QueryEditor: React.FC<QueryEditorProps> = ({
  value,
  onChange,
  onExecute,
  onSave,
  isRunning,
  fontSize,
  tabSize,
  theme,
  onFontSizeChange,
}) => {
  const editorRef = useRef<any>(null);

  // Store latest callbacks in refs to avoid stale closures in Monaco commands
  const onExecuteRef = useRef(onExecute);
  const onSaveRef = useRef(onSave);
  const fontSizeRef = useRef(fontSize);
  const onFontSizeChangeRef = useRef(onFontSizeChange);

  useEffect(() => {
    onExecuteRef.current = onExecute;
  }, [onExecute]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

  useEffect(() => {
    onFontSizeChangeRef.current = onFontSizeChange;
  }, [onFontSizeChange]);

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Single source of truth for query execution:
    // Ctrl+Enter / Cmd+Enter runs the query
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecuteRef.current();
    });

    // Ctrl+S / Cmd+S saves the query
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current();
    });

    // Font size shortcuts inside editor:
    // Ctrl + = (or Ctrl + +)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
      const next = Math.min(24, fontSizeRef.current + 1);
      onFontSizeChangeRef.current(next);
    });

    // Ctrl + -
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
      const next = Math.max(10, fontSizeRef.current - 1);
      onFontSizeChangeRef.current(next);
    });

    // Ctrl + 0 (reset font size)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0, () => {
      onFontSizeChangeRef.current(13);
    });

    // Listen to wheel event on the editor DOM node to support Ctrl + Mouse Wheel zoom
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener(
        'wheel',
        (e: WheelEvent) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            if (e.deltaY < 0) {
              const next = Math.min(24, fontSizeRef.current + 1);
              onFontSizeChangeRef.current(next);
            } else if (e.deltaY > 0) {
              const next = Math.max(10, fontSizeRef.current - 1);
              onFontSizeChangeRef.current(next);
            }
          }
        },
        { passive: false }
      );
    }

    // Configure SQL autocompletions
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: () => {
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING',
          'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ON', 'AS',
          'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'LIMIT', 'TOP',
          'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'COALESCE', 'ISNULL'
        ];
        const suggestions = keywords.map(kw => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
        }));
        return { suggestions };
      }
    });
  };

  const monacoTheme = theme === 'light' ? 'vs' : 'vs-dark';

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-[var(--bg-panel)] overflow-hidden select-none">
      {/* Action Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onExecuteRef.current()}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            title="Execute Query (Ctrl + Enter)"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-pulse' : ''}`} />
            <span>{isRunning ? 'Running...' : 'Run Query'}</span>
          </button>

          <button
            onClick={() => onSaveRef.current()}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-header)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium rounded transition-colors cursor-pointer border border-[var(--border-subtle)]"
            title="Save Query (Ctrl + S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            onClick={() => onChange('')}
            className="flex items-center gap-1 px-2 py-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs rounded transition-colors cursor-pointer"
            title="Clear Editor"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-mono">
          {/* Font controls */}
          <div className="flex items-center gap-1 mr-2 bg-[var(--bg-header)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
            <button
              onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
              className="p-0.5 hover:text-[var(--text-primary)] cursor-pointer"
              title="Decrease Font Size (Ctrl + -)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] w-6 text-center select-none font-sans font-medium text-[var(--text-secondary)]">
              {fontSize}px
            </span>
            <button
              onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
              className="p-0.5 hover:text-[var(--text-primary)] cursor-pointer"
              title="Increase Font Size (Ctrl + +)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <span className="hidden sm:inline">
            <kbd className="px-1 py-0.5 bg-[var(--bg-header)] rounded border border-[var(--border-subtle)]">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-[var(--bg-header)] rounded border border-[var(--border-subtle)]">Enter</kbd> to run
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">
            <kbd className="px-1 py-0.5 bg-[var(--bg-header)] rounded border border-[var(--border-subtle)]">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-[var(--bg-header)] rounded border border-[var(--border-subtle)]">S</kbd> to save
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 w-full min-h-0 overflow-hidden">
        <Editor
          height="100%"
          language="sql"
          theme={monacoTheme}
          value={value}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: fontSize,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 4,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: tabSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
            renderLineHighlight: 'all',
            padding: { top: 8, bottom: 8 },
            suggestOnTriggerCharacters: true,
            overviewRulerBorder: false,
          }}
        />
      </div>
    </div>
  );
};
