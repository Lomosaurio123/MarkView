'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useFileStore } from '@/store/fileStore';
import { useUIStore } from '@/store/uiStore';
import { invoke } from '@tauri-apps/api/core';
import * as monaco from 'monaco-editor';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { RotateCcw, Loader2, X, FileText, Search, ChevronDown, MoreHorizontal, Sparkles, Zap } from 'lucide-react';

export function EditorPane() {
  const { activeFilePath, openFiles, updateFileContent, updateCursorPosition, updateScrollPosition, markFileDirty, openFile } = useFileStore();
  const { theme } = useUIStore();
  
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const activeFile = activeFilePath ? openFiles.get(activeFilePath) : null;

  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Configure markdown language features
    monaco.languages.setLanguageConfiguration('markdown', {
      brackets: [
        ['[', ']'],
        ['(', ')'],
        ['{', '}'],
      ],
      autoClosingPairs: [
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '{', close: '}' },
        { open: '`', close: '`' },
        { open: '```', close: '```' },
      ],
      surroundingPairs: [
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '{', close: '}' },
        { open: '`', close: '`' },
        { open: '**', close: '**' },
        { open: '__', close: '__' },
        { open: '*', close: '*' },
        { open: '_', close: '_' },
        { open: '```', close: '```' },
      ],
    });

    // Wiki-link completion provider
    monaco.languages.registerCompletionItemProvider('markdown', {
      provideCompletionItems: (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        
        const wikiLinkMatch = textUntilPosition.match(/\[\[([^\]]*)$/);
        if (wikiLinkMatch) {
          // Return wiki-link suggestions
          return {
            suggestions: [{
              label: wikiLinkMatch[1] || '',
              kind: monaco.languages.CompletionItemKind.File,
              insertText: '',
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column - wikiLinkMatch[1].length - 2,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            }],
          };
        }
        return { suggestions: [] };
      },
      triggerCharacters: ['[', '|'],
    });

    // Model change listener
    editor.onDidChangeModelContent((e) => {
      if (modelRef.current && activeFilePath) {
        const newContent = modelRef.current.getValue();
        updateFileContent(activeFilePath, newContent);
        markFileDirty(activeFilePath, true);
      }
    });

    // Cursor position tracking
    editor.onDidChangeCursorPosition((e) => {
      if (activeFilePath) {
        updateCursorPosition(activeFilePath, {
          line: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    // Scroll position tracking
    editor.onDidScrollChange((e) => {
      if (activeFilePath) {
        updateScrollPosition(activeFilePath, e.scrollTop);
      }
    });

    setIsReady(true);
  }, [activeFilePath, updateFileContent, updateCursorPosition, updateScrollPosition, markFileDirty]);

  // Update model when active file changes
  useEffect(() => {
    if (!editorRef.current || !activeFile) return;
    
    const newModel = monaco.editor.createModel(
      activeFile.content,
      'markdown',
      monaco.Uri.parse(`file://${activeFile.path}`)
    );
    
    if (modelRef.current) {
      modelRef.current.dispose();
    }
    
    modelRef.current = newModel;
    editorRef.current.setModel(newModel);
    
    // Restore cursor position
    if (activeFile.cursorPosition) {
      editorRef.current.setPosition({ lineNumber: activeFile.cursorPosition.line, column: activeFile.cursorPosition.column });
      editorRef.current.revealLineInCenter(activeFile.cursorPosition.line);
    }
    
    // Restore scroll position
    if (activeFile.scrollPosition !== undefined) {
      editorRef.current.setScrollTop(activeFile.scrollPosition);
    }
  }, [activeFile]);

  // Theme change
  useEffect(() => {
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
  }, [theme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No file open</p>
          <p className="text-sm">Select a file from the sidebar to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="editor-toolbar flex items-center justify-between px-3 py-1 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate max-w-[200px]">{activeFile.path}</span>
          {activeFile.dirty && (
            <span className="flex items-center gap-1 text-xs text-amber-500">
              <Zap className="w-3 h-3" />
              Modified
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <div className="relative">
            <select
              className="input-field py-1 px-2 text-xs pr-6 appearance-none"
              defaultValue="markdown"
              disabled
            >
              <option value="markdown">Markdown</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          
          <button className="btn-icon" title="Format Document">
            <Sparkles className="w-4 h-4" />
          </button>
          
          <button className="btn-icon" title="Toggle Preview">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language="markdown"
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          value={activeFile.content}
          onMount={handleEditorDidMount}
          onChange={(value) => {
            if (value !== undefined) {
              updateFileContent(activeFile.path, value);
              markFileDirty(activeFile.path, true);
            }
          }}
          options={{
            fontSize: 14,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            lineHeight: 22,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            minimap: { enabled: false },
            lineNumbers: 'on',
            folding: true,
            matchBrackets: 'always',
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            formatOnType: true,
            dragAndDrop: true,
            links: true,
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            renderWhitespace: 'selection',
            renderControlCharacters: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
          }}
        />
      </div>

      <div className="editor-statusbar flex items-center justify-between px-3 py-1 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>Ln {activeFile.cursorPosition?.line || 1}, Col {activeFile.cursorPosition?.column || 1}</span>
          <span>{activeFile.content.split('\n').length} lines</span>
          <span>{activeFile.content.length} chars</span>
          <span>UTF-8</span>
          <span>LF</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-icon text-xs" title="Problems">
            <span className="w-2 h-2 rounded-full bg-green-500" />
          </button>
          <button className="btn-icon text-xs" title="Toggle Word Wrap">
            <span className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}