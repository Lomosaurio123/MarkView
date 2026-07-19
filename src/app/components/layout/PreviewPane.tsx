'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useFileStore } from '@/store/fileStore';
import { useUIStore } from '@/store/uiStore';
import { invoke } from '@tauri-apps/api/core';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItTaskLists from 'markdown-it-task-lists';
import markdownItWikilink from '@/lib/markdown-it-wikilink';
import { cn } from '@/lib/utils';
import { RefreshCw, RotateCcw, Loader2, X, Search, ChevronDown, MoreHorizontal, Sparkles, Zap, Maximize, Minimize, PanelLeftClose } from 'lucide-react';

let md: MarkdownIt | null = null;

function getMarkdownIt() {
  if (!md) {
    md = MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    })
      .use(markdownItAnchor, {
        permalink: {
          class: 'header-anchor',
          symbol: '#',
          renderAttrs: () => ({ 'aria-hidden': 'true' }),
        },
        level: [1, 2, 3, 4, 5, 6],
      })
      .use(markdownItFootnote)
      .use(markdownItTaskLists, { enabled: true })
      .use(markdownItWikilink, {
        pageResolver: (name: string) => {
          return `/specs/${name.toLowerCase().replace(/\s+/g, '-')}.md`;
        },
        linkClass: 'wiki-link',
      });
  }
  return md;
}

export function PreviewPane({ onClose }: { onClose?: () => void }) {
  const { activeFilePath, openFiles } = useFileStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncScroll, setSyncScroll] = useState(true);
  const isScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const activeFile = activeFilePath ? openFiles.get(activeFilePath) : null;

  const renderMarkdown = useCallback(async (content: string) => {
    if (!content.trim()) {
      setHtml('<div class="text-center text-muted-foreground py-12">No content</div>');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const markdownIt = getMarkdownIt();
      const rendered = markdownIt.render(content);
      setHtml(rendered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render markdown');
      setHtml('<div class="text-destructive p-4">Failed to render preview</div>');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeFile) {
      renderMarkdown(activeFile.content);
    }
  }, [activeFile, renderMarkdown]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll || isScrollingRef.current) return;
    
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    
    if (scrollHeight > 0) {
      const ratio = scrollTop / scrollHeight;
      
      if (editorRef.current) {
        isScrollingRef.current = true;
        const editorScrollHeight = editorRef.current.scrollHeight - editorRef.current.clientHeight;
        editorRef.current.scrollTop = ratio * editorScrollHeight;
        requestAnimationFrame(() => {
          isScrollingRef.current = false;
        });
      }
    }
    
    lastScrollTopRef.current = scrollTop;
  }, [syncScroll]);

  const handleEditorScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (!syncScroll || isScrollingRef.current || !previewRef.current) return;
    
    const ratio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    isScrollingRef.current = true;
    previewRef.current.scrollTop = ratio * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
    requestAnimationFrame(() => {
      isScrollingRef.current = false;
    });
  }, [syncScroll]);

  if (!activeFile) {
    return (
      <div className="flex h-full flex-col bg-card">
<div className="preview-toolbar flex items-center justify-between px-3 py-1 border-b border-border bg-muted/50">
          <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No file open</p>
            <p className="text-sm">Select a file from the sidebar to preview</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card relative">
      <div className="preview-toolbar flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview</span>
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
          {activeFile.dirty && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Modified
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="btn-icon"
              title="Close preview"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setSyncScroll(!syncScroll)}
            className={cn('btn-icon', syncScroll && 'btn-icon-active')}
            title={syncScroll ? 'Disable sync scroll' : 'Enable sync scroll'}
          >
            {syncScroll ? <RefreshCw className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
          </button>
          <button
            onClick={() => renderMarkdown(activeFile.content)}
            className="btn-icon"
            title="Refresh preview"
            disabled={isLoading}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => previewRef.current?.requestFullscreen?.()}
            className="btn-icon"
            title="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={previewRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 markdown-preview"
        onScroll={handleScroll}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      
      {error && (
        <div className="absolute bottom-2 right-2 p-2 bg-destructive/90 text-destructive-foreground text-xs rounded shadow-lg animate-slide-in-from-bottom">
          {error}
        </div>
      )}
    </div>
  );
}

function MarkdownItAnchor() {
  return {
    permalink: {
      headerLink: () => ({ safariReaderFix: true }),
    },
  };
}