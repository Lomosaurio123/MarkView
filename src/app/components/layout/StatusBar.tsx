'use client';

import { useUIStore } from '@/store/uiStore';
import { useFileStore } from '@/store/fileStore';
import { GitBranch, FileText, Braces, Wifi, CheckCircle, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { theme, setTheme } = useUIStore();
  const { activeFilePath, openFiles } = useFileStore();

  const activeFile = activeFilePath ? openFiles.get(activeFilePath) : null;

  return (
    <div className="status-bar fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-1 h-9 bg-muted/50 border-t border-border text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </div>
        {activeFile && (
          <>
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              <span>{activeFilePath?.split('/').pop()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Braces className="w-3 h-3" />
              <span>Ln 1, Col 1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>UTF-8</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>LF</span>
            </div>
          </>
        )}
        {!activeFile && (
          <div className="flex items-center gap-1.5 text-muted-foreground/50">
            <span>No file open</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-green-500" />
          <span>Indexed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
}