'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFileStore } from '@/store/fileStore';
import { useUIStore } from '@/store/uiStore';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, FileText, Folder, Search, Loader2, Filter, X, MoreHorizontal, Plus, FolderPlus, FilePlus, Settings, RefreshCw, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { Virtualizer, useVirtualizer } from '@tanstack/react-virtual';

interface TreeNodeProps {
  node: any;
  depth: number;
  onSelect: (node: any) => void;
  onToggle: (node: any) => void;
  onContextMenu: (e: React.MouseEvent, node: any) => void;
  filter?: string;
  expandedPaths: Set<string>;
  selectedPath: string | null;
}

function TreeNode({
  node,
  depth,
  onSelect,
  onToggle,
  onContextMenu,
  filter = '',
  expandedPaths,
  selectedPath,
}: TreeNodeProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.isDirectory && node.children && node.children.length > 0;
  const matchesFilter = filter === '' || node.name.toLowerCase().includes(filter.toLowerCase());
  
  if (!matchesFilter && !(node.children?.some((c: any) => c.name.toLowerCase().includes(filter.toLowerCase())))) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // Multi-select
    } else {
      onSelect(node);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node);
    } else {
      onSelect(node);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  return (
    <div
      className={cn(
        'tree-item relative group',
        isSelected && 'tree-item-selected',
        !matchesFilter && 'opacity-50'
      )}
      style={{ paddingLeft: depth * 16 + 8 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {hasChildren && (
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node);
          }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      )}
      
      <div className="flex items-center gap-2">
        {node.isDirectory ? (
          <Folder className="tree-item-icon w-4 h-4 flex-shrink-0" />
        ) : (
          <FileText className="tree-item-icon w-4 h-4 flex-shrink-0" />
        )}
        <span className="truncate flex-1 min-w-0">{node.name}</span>
        {node.gitStatus && (
          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase">
            {node.gitStatus}
          </span>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const {
    tree,
    filteredTree,
    filterQuery,
    setFilterQuery,
    showHidden,
    setShowHidden,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    toggleNode,
    selectFile,
    expandedPaths,
    selectedPath,
    initialize,
  } = useFileStore();
  
  const { sidebarWidth, setSidebarWidth, theme, setTheme } = useUIStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    let cleanupFn: (() => void) | null = null;
    let mounted = true;
    
    listen('fs://changed', (event) => {
      if (mounted) {
        console.log('File system changed:', event.payload);
        initialize();
      }
    }).then(fn => {
      if (mounted) {
        cleanupFn = fn;
      }
    });
    
    return () => {
      mounted = false;
      if (cleanupFn) cleanupFn();
    };
  }, [initialize]);

  const virtualizer = useVirtualizer({
    count: filteredTree.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const handleSelect = useCallback((node: any) => {
    if (!node.isDirectory) {
      setSelected(node.path);
      selectFile(node.path);
    }
  }, [selectFile]);

  const handleToggle = useCallback((node: any) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(node.path)) {
        next.delete(node.path);
      } else {
        next.add(node.path);
      }
      return next;
    });
    toggleNode(node.path);
  }, [toggleNode]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: any) => {
    e.preventDefault();
    console.log('Context menu for:', node.path);
  }, []);

  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      <div className="sidebar-header flex items-center justify-between px-3 py-1 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Specs</h2>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-icon" title="New file" onClick={() => console.log('New file')}>
            <FilePlus className="w-4 h-4" />
          </button>
          <button className="btn-icon" title="New folder" onClick={() => console.log('New folder')}>
            <FolderPlus className="w-4 h-4" />
          </button>
          <button className="btn-icon" title="Refresh" onClick={initialize}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-icon" title="Settings" onClick={() => console.log('Settings')}>
            <Settings className="w-4 h-4" />
          </button>
          <button
            className="btn-icon"
            title="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="sidebar-search px-3 py-1 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter files..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="input-field pl-9 pr-8"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-options flex items-center gap-2 px-2 py-0.5 border-b border-border text-xs text-muted-foreground">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="input-field py-1 px-2 text-xs"
        >
          <option value="name">Name</option>
          <option value="type">Type</option>
          <option value="modified">Modified</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          className="input-field py-1 px-2 text-xs w-20"
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="rounded border-input"
          />
          Hidden
        </label>
      </div>

      <div
        ref={parentRef}
        className="flex-1 relative h-full overflow-y-auto scrollbar-thin min-h-0"
      >
        <div style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TreeNode
                node={filteredTree[virtualRow.index]}
                depth={0}
                onSelect={handleSelect}
                onToggle={handleToggle}
                onContextMenu={handleContextMenu}
                filter={filterQuery}
                expandedPaths={expanded}
                selectedPath={selected}
              />
            </div>
          ))}
        </div>
      </div>

      {filteredTree.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
          <div className="text-center">
            <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No files found</p>
            <p className="text-sm">Create a new spec or open a folder</p>
          </div>
        </div>
      )}

      <div className="sidebar-footer px-3 py-1 border-t border-border text-xs text-muted-foreground">
        <span>{tree.length} files</span>
      </div>

      <div
        className="w-1 h-full bg-transparent cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
        style={{ right: 0 }}
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = sidebarWidth;
          
          const onMouseMove = (e: MouseEvent) => {
            const newWidth = Math.max(200, Math.min(500, startWidth + (e.clientX - startX)));
            setSidebarWidth(newWidth);
          };
          
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
      />
    </div>
  );
}

 