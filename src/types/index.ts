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

export interface SearchResult {
  path: string;
  title: string;
  type: string;
  status: string;
  tags: string[];
  id: string;
  score: number;
  highlights: {
    content?: string[];
    title?: string[];
  };
}

export interface SearchFilters {
  types?: string[];
  statuses?: string[];
  tags?: string[];
  paths?: string[];
  dateRange?: { start: string; end: string };
}

export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  date: string;
  parents: string[];
}

export interface BlameLine {
  line: number;
  hash: string;
  author: string;
  date: string;
  summary: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface GitStatus {
  currentBranch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
}

export interface GitFileStatus {
  path: string;
  indexStatus: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'ignored' | 'unmodified';
  worktreeStatus: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'ignored' | 'unmodified';
}

export interface Template {
  name: string;
  content: string;
  variables: TemplateVariable[];
  description?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  default?: any;
  options?: string[];
  required: boolean;
  description?: string;
}

export interface Config {
  project: ProjectConfig;
  structure: StructureConfig;
  schemas: SchemasConfig;
  templates: TemplatesConfig;
  search: SearchConfig;
  git: GitConfig;
  export: ExportConfig;
  editor: EditorConfig;
  preview: PreviewConfig;
}

export interface ProjectConfig {
  name: string;
  root: string;
  indexFile: string;
}

export interface StructureConfig {
  mode: 'feature' | 'type' | 'phase' | 'flat';
  featurePrefixes?: string[];
}

export interface SchemasConfig {
  spec: string;
  requirement?: string;
  design?: string;
  task?: string;
  adr?: string;
}

export interface TemplatesConfig {
  dir: string;
  default: string;
}

export interface SearchConfig {
  enabled: boolean;
  indexPath: string;
  watch: boolean;
}

export interface GitConfig {
  enabled: boolean;
  blameEnabled: boolean;
  diffAlgorithm: 'myers' | 'minimal' | 'patience' | 'histogram';
}

export interface ExportConfig {
  pandocPath: string;
  defaultFormat: 'pdf' | 'html' | 'docx';
  templatesDir: string;
}

export interface EditorConfig {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  vimMode: boolean;
  vimLeader: string;
}

export interface PreviewConfig {
  syncScroll: boolean;
  theme: 'github-light' | 'github-dark' | 'auto';
  mermaid: boolean;
  math: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  status: string;
  path: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'link' | 'depends_on' | 'tag';
}

export interface ExportOptions {
  format: 'pdf' | 'html' | 'docx';
  template?: string;
  combine?: boolean;
  toc?: boolean;
  metadata?: Record<string, any>;
}

export interface ExportResult {
  data: Uint8Array;
  filename: string;
}

export interface SpecFrontmatter {
  id: string;
  title: string;
  type: 'vision' | 'requirement' | 'design' | 'task' | 'adr' | 'glossary';
  status: 'draft' | 'review' | 'approved' | 'implemented' | 'deprecated' | 'archived';
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  tags?: string[];
  links?: string[];
  depends_on?: string[];
  author?: string;
  created?: string;
  updated?: string;
  version?: string;
}