import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { FileNode } from '@/store/fileStore';
import type { SearchResult, SearchFilters, Commit, BlameLine, DiffHunk, GitStatus, Template, Config, ValidationResult, GraphData, ExportOptions, ExportResult } from '@/types';

export const api = {
  fs: {
    readDir: (path: string, depth = 3) => invoke<FileNode[]>('fs:read_dir', { path, depth }),
    readFile: (path: string) => invoke<{ content: string; frontmatter: Record<string, any>; path: string }>('fs:read_file', { path }),
    writeFile: (path: string, content: string, frontmatter?: Record<string, any>) => invoke('fs:write_file', { path, content, frontmatter }),
    createFile: (path: string, template: string, vars: Record<string, any>) => invoke<FileNode>('fs:create_file', { path, template, vars }),
    delete: (path: string, recursive = false) => invoke('fs:delete', { path, recursive }),
    rename: (from: string, to: string) => invoke<FileNode>('fs:rename', { from, to }),
    watch: (path: string, callback: (event: { path: string; event: 'create' | 'modify' | 'delete' | 'rename' }) => void) => listen<{ path: string; event: 'create' | 'modify' | 'delete' | 'rename' }>(`fs://${path}`, (e) => callback(e.payload)),
  },

  search: {
    index: (root: string, force = false) => invoke<{ filesIndexed: number; durationMs: number }>('search:index', { root, force }),
    search: (query: string, filters: SearchFilters, limit = 50) => invoke<SearchResult[]>('search:search', { query, filters, limit }),
    suggest: (prefix: string, field?: string) => invoke<string[]>('search:suggest', { prefix, field }),
  },

  git: {
    log: (path?: string, limit = 50, since?: string) => invoke<Commit[]>('git:log', { path, limit, since }),
    blame: (path: string) => invoke<BlameLine[]>('git:blame', { path }),
    diff: (path: string, base?: string, head?: string) => invoke<DiffHunk[]>('git:diff', { path, base, head }),
    status: (path?: string) => invoke<GitStatus>('git:status', { path }),
  },

  templates: {
    list: () => invoke<Template[]>('templates:list'),
    render: (name: string, vars: Record<string, any>) => invoke<string>('templates:render', { name, vars }),
    create: (name: string, content: string) => invoke<Template>('templates:create', { name, content }),
    delete: (name: string) => invoke('templates:delete', { name }),
  },

  export: {
    toPdf: (paths: string[], options: ExportOptions) => invoke<ExportResult>('export:to_pdf', { paths, options }),
    toHtml: (paths: string[], options: ExportOptions) => invoke<string>('export:to_html', { paths, options }),
    toDocx: (paths: string[], options: ExportOptions) => invoke<ExportResult>('export:to_docx', { paths, options }),
  },

  schema: {
    validate: (frontmatter: Record<string, any>, schema: string) => invoke<ValidationResult>('schema:validate', { frontmatter, schema }),
    list: () => invoke<string[]>('schema:list'),
  },

  config: {
    load: (projectPath?: string) => invoke<Config>('config:load', { projectPath }),
    save: (config: Config) => invoke('config:save', { config }),
  },

  graph: {
    build: (root: string) => invoke<GraphData>('graph:build', { root }),
  },
};