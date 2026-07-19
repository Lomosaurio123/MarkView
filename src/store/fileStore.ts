import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FileNode {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileNode[];
  expanded?: boolean;
  selected?: boolean;
  frontmatter?: Record<string, any>;
  gitStatus?: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'ignored';
}

export interface OpenFile {
  path: string;
  content: string;
  frontmatter: Record<string, any>;
  dirty: boolean;
  cursorPosition?: { line: number; column: number };
  scrollPosition?: number;
}

export interface FileState {
  tree: FileNode[];
  openFiles: Map<string, OpenFile>;
  activeFilePath: string | null;
  filteredTree: FileNode[];
  filterQuery: string;
  showHidden: boolean;
  sortBy: 'name' | 'type' | 'modified';
  sortOrder: 'asc' | 'desc';
  expandedPaths: Set<string>;
  selectedPath: string | null;
  sidebarWidth: number;
  
  setTree: (tree: FileNode[]) => void;
  setFilteredTree: (tree: FileNode[]) => void;
  setFilterQuery: (query: string) => void;
  setShowHidden: (show: boolean) => void;
  setSortBy: (by: 'name' | 'type' | 'modified') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  toggleNode: (path: string) => void;
  selectFile: (path: string) => void;
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  updateFileFrontmatter: (path: string, frontmatter: Record<string, any>) => void;
  markFileDirty: (path: string, dirty: boolean) => void;
  updateCursorPosition: (path: string, position: { line: number; column: number }) => void;
  updateScrollPosition: (path: string, position: number) => void;
  removeFileFromTree: (path: string) => void;
  renameFileInTree: (oldPath: string, newPath: string) => void;
  addFileToTree: (parentPath: string, node: FileNode) => void;
  setGitStatus: (path: string, status: FileNode['gitStatus']) => void;
  initialize: () => Promise<void>;
  setExpandedPaths: (paths: Set<string>) => void;
  setSelectedPath: (path: string | null) => void;
  setSidebarWidth: (width: number) => void;
}

const filterTree = (tree: FileNode[], query: string, showHidden: boolean): FileNode[] => {
  if (!query.trim()) return tree;
  
  const lowerQuery = query.toLowerCase();
  
  const filterNode = (node: FileNode): FileNode | null => {
    if (!showHidden && node.name.startsWith('.')) return null;
    
    const matches = node.name.toLowerCase().includes(lowerQuery);
    const filteredChildren = node.children?.map(filterNode).filter(Boolean) as FileNode[] | undefined;
    
    if (matches || (filteredChildren && filteredChildren.length > 0)) {
      return { ...node, children: filteredChildren, expanded: !!filteredChildren?.length };
    }
    
    return matches ? { ...node } : null;
  };
  
  return tree.map(filterNode).filter(Boolean) as FileNode[];
};

const sortTree = (tree: FileNode[], sortBy: 'name' | 'type' | 'modified', sortOrder: 'asc' | 'desc'): FileNode[] => {
  const multiplier = sortOrder === 'asc' ? 1 : -1;
  
  const compare = (a: FileNode, b: FileNode): number => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name) * multiplier;
      case 'modified':
        return 0;
      default:
        return 0;
    }
  };
  
  return [...tree].sort(compare).map(node => ({
    ...node,
    children: node.children ? sortTree(node.children, sortBy, sortOrder) : undefined,
  }));
};

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      tree: [],
      openFiles: new Map(),
      activeFilePath: null,
      filteredTree: [],
      filterQuery: '',
      showHidden: false,
      sortBy: 'name',
      sortOrder: 'asc',
      expandedPaths: new Set(),
      selectedPath: null,
      sidebarWidth: 300,

      setTree: (tree) => {
        const sorted = sortTree(tree, get().sortBy, get().sortOrder);
        const filtered = filterTree(sorted, get().filterQuery, get().showHidden);
        set({ tree: sorted, filteredTree: filtered });
      },

      setFilteredTree: (tree) => set({ filteredTree: tree }),

      setFilterQuery: (query) => {
        const filtered = filterTree(get().tree, query, get().showHidden);
        set({ filterQuery: query, filteredTree: filtered });
      },

      setShowHidden: (show) => {
        const filtered = filterTree(get().tree, get().filterQuery, show);
        set({ showHidden: show, filteredTree: filtered });
      },

      setSortBy: (by) => {
        const sorted = sortTree(get().tree, by, get().sortOrder);
        const filtered = filterTree(sorted, get().filterQuery, get().showHidden);
        set({ sortBy: by, tree: sorted, filteredTree: filtered });
      },

      setSortOrder: (order) => {
        const sorted = sortTree(get().tree, get().sortBy, order);
        const filtered = filterTree(sorted, get().filterQuery, get().showHidden);
        set({ sortOrder: order, tree: sorted, filteredTree: filtered });
      },

      toggleNode: (path) => {
        const toggle = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.path === path) {
              return { ...node, expanded: !node.expanded };
            }
            if (node.children) {
              return { ...node, children: toggle(node.children) };
            }
            return node;
          });
        };
        
        const newTree = toggle(get().tree);
        const filtered = filterTree(newTree, get().filterQuery, get().showHidden);
        set({ tree: newTree, filteredTree: filtered });
      },

      selectFile: (path) => {
        set((state) => {
          const newTree = state.tree.map(node => {
            const updateSelection = (n: FileNode): FileNode => ({
              ...n,
              selected: n.path === path,
              children: n.children?.map(updateSelection),
            });
            return updateSelection(node);
          });
          
          const filtered = filterTree(newTree, state.filterQuery, state.showHidden);
          return { tree: newTree, filteredTree: filtered, activeFilePath: path };
        });
      },

      openFile: (file) => {
        set((state) => {
          const newOpenFiles = new Map(state.openFiles);
          newOpenFiles.set(file.path, file);
          return { openFiles: newOpenFiles, activeFilePath: file.path };
        });
      },

      closeFile: (path) => {
        set((state) => {
          const newOpenFiles = new Map(state.openFiles);
          newOpenFiles.delete(path);
          let newActive = state.activeFilePath;
          if (state.activeFilePath === path) {
            const remaining = Array.from(newOpenFiles.keys());
            newActive = remaining.length > 0 ? remaining[remaining.length - 1] : null;
          }
          return { openFiles: newOpenFiles, activeFilePath: newActive };
        });
      },

      setActiveFile: (path) => set({ activeFilePath: path }),

      updateFileContent: (path, content) => {
        set((state) => {
          const file = state.openFiles.get(path);
          if (!file) return state;
          const newOpenFiles = new Map(state.openFiles);
          newOpenFiles.set(path, { ...file, content, dirty: true });
          return { openFiles: newOpenFiles };
        });
      },

      updateFileFrontmatter: (path, frontmatter) => {
        set((state) => {
          const file = state.openFiles.get(path);
          if (!file) return state;
          const newOpenFiles = new Map(state.openFiles);
          newOpenFiles.set(path, { ...file, frontmatter, dirty: true });
          return { openFiles: newOpenFiles };
        });
      },

      markFileDirty: (path, dirty) => {
        set((state) => {
          const file = state.openFiles.get(path);
          if (!file) return state;
          const newOpenFiles = new Map(state.openFiles);
          newOpenFiles.set(path, { ...file, dirty });
          return { openFiles: newOpenFiles };
        });
      },

      updateCursorPosition: (path, position) => {
        set((state) => {
          const file = state.openFiles.get(path);
          if (!file) return state;
          const newOpenFiles = new Map(state.openFiles);
          newOpenFiles.set(path, { ...file, cursorPosition: position });
          return { openFiles: newOpenFiles };
        });
      },

      updateScrollPosition: (path, position) => {
        set((state) => {
          const file = state.openFiles.get(path);
          if (!file) return state;
          const newOpenFiles = new Map(state.openFiles);
          newOpenFiles.set(path, { ...file, scrollPosition: position });
          return { openFiles: newOpenFiles };
        });
      },

      removeFileFromTree: (path) => {
        const remove = (nodes: FileNode[]): FileNode[] => {
          return nodes
            .filter(node => node.path !== path)
            .map(node => ({
              ...node,
              children: node.children ? remove(node.children) : undefined,
            }));
        };
        
        const newTree = remove(get().tree);
        const filtered = filterTree(newTree, get().filterQuery, get().showHidden);
        set({ tree: newTree, filteredTree: filtered });
      },

      renameFileInTree: (oldPath, newPath) => {
        const rename = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.path === oldPath) {
              const newName = newPath.split('/').pop() || newPath;
              return { ...node, path: newPath, name: newName };
            }
            if (node.children) {
              return { ...node, children: rename(node.children) };
            }
            return node;
          });
        };
        
        const newTree = rename(get().tree);
        const filtered = filterTree(newTree, get().filterQuery, get().showHidden);
        set({ tree: newTree, filteredTree: filtered });
      },

      addFileToTree: (parentPath, node) => {
        const add = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(n => {
            if (n.path === parentPath) {
              return { ...n, children: [...(n.children || []), node], expanded: true };
            }
            if (n.children) {
              return { ...n, children: add(n.children) };
            }
            return n;
          });
        };
        
        const newTree = add(get().tree);
        const filtered = filterTree(newTree, get().filterQuery, get().showHidden);
        set({ tree: newTree, filteredTree: filtered });
      },

      setGitStatus: (path, status) => {
        const update = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.path === path) {
              return { ...node, gitStatus: status };
            }
            if (node.children) {
              return { ...node, children: update(node.children) };
            }
            return node;
          });
        };
        
        const newTree = update(get().tree);
        const filtered = filterTree(newTree, get().filterQuery, get().showHidden);
        set({ tree: newTree, filteredTree: filtered });
      },

      initialize: async () => {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const tree = await invoke<FileNode[]>('fs:read_dir', { path: '', depth: 3 });
          const sorted = sortTree(tree, get().sortBy, get().sortOrder);
          const filtered = filterTree(sorted, get().filterQuery, get().showHidden);
          set({ tree: sorted, filteredTree: filtered });
        } catch (error) {
          console.error('Failed to initialize file tree:', error);
        }
      },

      setExpandedPaths: (paths: Set<string>) => set({ expandedPaths: paths }),
      setSelectedPath: (path: string | null) => set({ selectedPath: path }),
      setSidebarWidth: (width: number) => set({ sidebarWidth: width }),
    }),
    {
      name: 'markview-files',
      partialize: (state) => ({
        showHidden: state.showHidden,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
);