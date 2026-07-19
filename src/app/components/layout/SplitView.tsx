'use client';

import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { Sidebar } from './Sidebar';
import { EditorPane } from './EditorPane';
import { PreviewPane } from './PreviewPane';
import { RightSidebar } from './RightSidebar';

export function SplitView() {
  const [leftWidth, setLeftWidth] = useState(300);
  const [previewWidth, setPreviewWidth] = useState(400);
  
  const [showPreview, setShowPreview] = useState(true);
  const { showRightSidebar, rightSidebarWidth, setRightSidebarWidth, toggleRightSidebar } = useUIStore();

  const leftRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .split-panel {
        display: flex;
        flex-direction: column;
      }
      :root {
        --left-width: 300px;
        --preview-width: 400px;
        --right-width: 320px;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--left-width', `${leftWidth}px`);
  }, [leftWidth]);

  useEffect(() => {
    document.documentElement.style.setProperty('--preview-width', `${previewWidth}px`);
  }, [previewWidth]);

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <div
        ref={leftRef}
        className="split-panel transition-smooth bg-card border-r border-border"
        style={{ width: leftWidth, minWidth: 240, maxWidth: 480, flexShrink: 0 }}
      >
        <Sidebar />
      </div>

      <div
        className="split-panel relative flex-1 min-w-0 overflow-hidden"
        style={{ flexGrow: 1 }}
      >
        <div className="flex h-full">
          <div ref={centerRef} className="flex-1 min-w-0 overflow-hidden">
            <EditorPane />
          </div>

          {showPreview && (
            <div
              ref={previewRef}
              className="split-panel transition-smooth bg-card border-l border-border overflow-hidden flex-shrink-0"
              style={{ width: previewWidth, minWidth: 300, maxWidth: 600 }}
            >
              <PreviewPane onClose={() => setShowPreview(false)} />
            </div>
          )}

          {showRightSidebar && (
            <div
              ref={rightRef}
              className="split-panel transition-smooth bg-card border-l border-border overflow-hidden flex-shrink-0"
              style={{ width: rightSidebarWidth, minWidth: 0, maxWidth: 480 }}
            >
              <RightSidebar onClose={() => toggleRightSidebar()} />
            </div>
          )}
        </div>
      </div>

      <div
        className="absolute top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
        style={{ left: leftWidth }}
        onMouseDown={(e) => startResize(e, 'left', setLeftWidth)}
      />

      {showPreview && (
        <div
          className="absolute top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
          style={{ left: `calc(var(--left-width) + var(--preview-width))` }}
          onMouseDown={(e) => startResize(e, 'preview', setPreviewWidth)}
        />
      )}

      {showRightSidebar && (
        <div
          className="absolute top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
          style={{ right: rightSidebarWidth }}
          onMouseDown={(e) => startResize(e, 'right', setRightSidebarWidth)}
        />
      )}
    </div>
  );
}

function startResize(
  e: React.MouseEvent,
  side: 'left' | 'preview' | 'right',
  setter: (width: number) => void
) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = side === 'left' ? 300 : side === 'preview' ? 400 : 320;

  const onMouseMove = (e: MouseEvent) => {
    const delta = e.clientX - startX;
    let newWidth: number;
    
    if (side === 'left') {
      newWidth = Math.max(240, Math.min(480, startWidth + delta));
    } else if (side === 'preview') {
      newWidth = Math.max(300, Math.min(600, startWidth + delta));
    } else {
      newWidth = Math.max(280, Math.min(480, startWidth - delta));
    }
    
    setter(newWidth);
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}