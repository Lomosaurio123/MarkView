# Spec-Driven Markdown Viewer - Technical Specification

## 1. Overview

**MarkView** - Desktop application (Tauri + React + TypeScript) for viewing and managing organized Markdown specifications, designed for *Spec-Driven Development*.

### Objectives
- View Markdown specs organized hierarchically with tree navigation
- Real-time preview (split view) with scroll synchronization
- Full-text search with inverted index (Tantivy via Tauri/Rust)
- Bidirectional navigation via [[wiki-links]] and [markdown-links]
- Frontmatter/YAML validation against JSON Schema
- Export to PDF/HTML (pandoc via Tauri sidecar)
- Spec templates with variables (Jinja2/Tera)
- Git integration: blame, diff, history per file
- Flexible, configurable spec structure

---

## 2. Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Runtime** | Tauri v2 (Rust + WebView) | Lightweight native binary, security, Rust for search/indexing |
| **Frontend** | React 18 + TypeScript + Vite | Mature ecosystem, React DevTools, React Query for state |
| **UI** | Radix UI + Tailwind CSS | Accessible, headless, easy theming, native tree view |
| **Editor/Preview** | Monaco Editor + Markdown-it + Mermaid | Monaco = VS Code experience, markdown-it + plugins |
| **Search** | Tantivy (Rust) + Tauri commands | Native full-text search, incremental indexing |
| **Markdown** | markdown-it + plugins (anchor, anchor-link, mermaid, footnote, front-matter) | Extensible, CommonMark compliant |
| **Wiki-links** | markdown-it-wikilink + graph resolution | Bidirectional [[wiki-links]] |
| **Frontmatter** | gray-matter + AJV (JSON Schema) | JSON Schema validation |
| **Git** | git2-rs (Rust) via Tauri commands | blame, diff, log, diff-highlight |
| **Export** | Pandoc (sidecar binary) + Tauri sidecar | Professional quality PDF/HTML/DOCX |
| **Templates** | Tera (Jinja2-like in Rust) | Templates with variables, conditionals, loops |
| **Config** | TOML + JSON Schema | Versionable, validatable config |
| **State** | Zustand + React Query | Simple global state + server state (search index) |
| **Tree View** | @radix-ui/react-navigation-menu + custom tree | Virtualized, accessible, keyboard nav |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Tauri App                              │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TS)          │  Backend (Rust/Tauri)     │
├─────────────────────────────────┼───────────────────────────┤
│  - App Shell (Layout)           │  - Tauri Commands         │
│  - Sidebar (Tree View)          │    - fs: read_dir, read   │
│  - Editor (Monaco)              │    - search: index, search│
│  - Preview (markdown-it)        │    - git: log, blame, diff│
│  - Search Modal (Cmd+K)         │    - templates: render    │
│  - Graph View (GraphViz/Vis)    │    - export: pandoc       │
│  - Settings/Config              │    - fs: watch (notify)   │
│  - Template Manager             │    - schema: validate     │
│  - Git Panel (Blame/Diff/Log)   │  - Tantivy Index (Rust)   │
│                                 │  - Tera Templates (Rust)  │
│  State: Zustand + React Query   │  - Pandoc sidecar         │
│  IPC: Tauri invoke + Events     │  - git2-rs                │
└─────────────────────────────────┴───────────────────────────┘
```

### Frontend ↔ Backend Communication
- **Commands** (invoke): fs ops, search, git, templates, export, schema validation
- **Events** (listen): file watcher events, index progress, git changes
- **State**: React Query for search/index status, Zustand for UI state

---

## 4. Spec Structure (Configurable)

### Recommended Schema (Spec-Driven Development)

```
specs/
├── .markview/
│   ├── config.toml           # Project config
│   ├── schemas/              # JSON Schemas for frontmatter
│   │   ├── spec.schema.json
│   │   ├── requirement.schema.json
│   │   └── task.schema.json
│   ├── templates/            # Tera templates
│   │   ├── spec.md.tera
│   │   ├── requirement.md.tera
│   │   └── task.md.tera
│   └── index.tantivy/        # Tantivy index (auto-generated)
├── 00-foundation/            # Foundation / Core
│   ├── 01-vision.md
│   ├── 02-glossary.md
│   └── 03-principles.md
├── 01-auth/                  # Feature: Auth
│   ├── 01-requirements.md    # Requirements (REQ-*)
│   ├── 02-design.md          # Technical design (DES-*)
│   ├── 03-tasks.md           # Tasks (TASK-*)
│   └── 04-adr.md             # ADRs
├── 02-payments/
│   └── ...
├── 99-archive/               # Obsolete/deprecated specs
└── index.md                  # Master index / MOC (Map of Content)
```

### Frontmatter Schema (spec.schema.json)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Spec Frontmatter",
  "type": "object",
  "required": ["id", "title", "type", "status"],
  "properties": {
    "id": { "type": "string", "pattern": "^[A-Z]{2,4}-\\d{3,}$" },
    "title": { "type": "string", "minLength": 3 },
    "type": { "enum": ["vision", "requirement", "design", "task", "adr", "glossary"] },
    "status": { "enum": ["draft", "review", "approved", "implemented", "deprecated", "archived"] },
    "priority": { "enum": ["P0", "P1", "P2", "P3"] },
    "tags": { "type": "array", "items": { "type": "string" } },
    "links": { "type": "array", "items": { "type": "string" } },
    "depends_on": { "type": "array", "items": { "type": "string", "pattern": "^[A-Z]{2,4}-\\d{3,}$" } },
    "author": { "type": "string" },
    "created": { "type": "string", "format": "date" },
    "updated": { "type": "string", "format": "date" },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" }
  }
}
```

### Project Config (.markview/config.toml)
```toml
[project]
name = "MyProject Specs"
root = "specs"
index_file = "index.md"

[structure]
# Options: "feature", "type", "phase", "flat"
mode = "feature"
# For mode = "feature": prefixes per feature
feature_prefixes = ["00-foundation", "01-auth", "02-payments", "99-archive"]

[schemas]
spec = "schemas/spec.schema.json"
requirement = "schemas/requirement.schema.json"

[templates]
dir = "templates"
default = "spec.md.tera"

[search]
enabled = true
index_path = ".markview/index.tantivy"
watch = true

[git]
enabled = true
blame_enabled = true
diff_algorithm = "patience"

[export]
pandoc_path = "pandoc"  # sidecar
default_format = "pdf"
templates_dir = "export-templates"

[editor]
font_size = 14
font_family = "JetBrains Mono"
tab_size = 2
vim_mode = false
vim_leader = " "

[preview]
sync_scroll = true
theme = "github-light"
mermaid = true
math = true
```

---

## 5. Frontend Modules (React)

### 5.1 App Shell (`src/app/`)
```
src/
├── app/
│   ├── App.tsx                 # Main layout (split view)
│   ├── providers.tsx           # Providers: QueryClient, Theme, Tauri
│   └── routes.tsx              # React Router (optional, for views)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Tree view + tabs (Files/Search/Git/Templates)
│   │   ├── EditorPane.tsx      # Monaco Editor
│   │   ├── PreviewPane.tsx     # Markdown preview (sandboxed iframe)
│   │   ├── SplitView.tsx       # Resizable split (react-resizable-panels)
│   │   └── StatusBar.tsx       # Git status, encoding, line/col, sync status
│   ├── tree/
│   │   ├── SpecTree.tsx        # Virtualized tree (@tanstack/react-virtual)
│   │   ├── TreeNode.tsx        # Recursive node with keyboard nav
│   │   ├── TreeContextMenu.tsx # Context menu (new, rename, delete, template)
│   │   └── useTree.ts          # Hook: expanded, selected, filtered state
│   ├── editor/
│   │   ├── MonacoEditor.tsx    # Monaco wrapper with config
│   │   ├── WikiLinkProvider.ts # Completion provider for [[wiki-links]]
│   │   ├── FrontmatterEditor.tsx # Form sidebar for frontmatter
│   │   └── Diagnostics.tsx     # Diagnostics panel (schema errors, broken links)
│   ├── preview/
│   │   ├── MarkdownPreview.tsx # markdown-it render in iframe
│   │   ├── MermaidRenderer.tsx # Mermaid diagram renderer
│   │   ├── MathRenderer.tsx    # KaTeX/MathJax
│   │   └── SyncScroll.tsx      # Sync scroll editor ↔ preview
│   ├── search/
│   │   ├── SearchModal.tsx     # Cmd+K modal (cmdk)
│   │   ├── SearchResults.tsx   # Results list with highlights
│   │   ├── SearchFilters.tsx   # Filters: type, status, tags, path
│   │   └── useSearch.ts        # React Query hook for search
│   ├── graph/
│   │   ├── GraphView.tsx       # Graph view (react-force-graph / cytoscape)
│   │   ├── GraphNode.tsx       # Node with type, status, links
│   │   └── useGraphData.ts     # Hook to build graph from links
│   ├── git/
│   │   ├── GitPanel.tsx        # Side panel: Log / Blame / Diff
│   │   ├── GitBlame.tsx        # Inline annotations in editor
│   │   ├── GitDiff.tsx         # Diff view (split/unified)
│   │   └── GitLog.tsx          # History with filter
│   ├── templates/
│   │   ├── TemplateManager.tsx # CRUD templates
│   │   ├── TemplateEditor.tsx  # Tera/Jinja2 editor
│   │   └── NewFromTemplate.tsx # Modal new file from template
│   ├── export/
    │   ├── ExportDialog.tsx    # Export modal: format, template, range
    │   └── ExportProgress.tsx  # Pandoc progress bar
    ├── settings/
    │   ├── SettingsPanel.tsx   # Tabs: Editor, Preview, Git, Export, Templates
    │   └── SchemaEditor.tsx    # Visual JSON Schema editor
    └── ui/                     # Base components (Button, Input, Modal, etc.)
├── hooks/
│   ├── useTauri.ts             # Invoke/listen wrappers
│   ├── useFileSystem.ts        # FS watch, read, write
│   ├── useSearch.ts            # Search hook with debounce
│   ├── useGit.ts               # Git hooks
│   ├── useTemplates.ts         # Templates hook
│   └── useGraph.ts             # Graph data hook
├── services/
│   ├── api.ts                  # Typed Tauri invoke wrappers
│   ├── markdown.ts             # markdown-it instance + plugins
│   ├── wikiLinks.ts            # Wiki-link resolution, graph building
│   ├── schema.ts               # AJV validation
│   └── export.ts               # Pandoc invocation
├── store/
│   ├── uiStore.ts              # Zustand: sidebar width, active pane, theme
│   ├── fileStore.ts            # Zustand: open files, active file, tree state
│   └── searchStore.ts          # Search history, filters
├── types/
│   ├── spec.ts                 # Frontmatter, spec, config types
│   ├── tauri.ts                # Tauri command types
│   └── git.ts                  # Git types
└── utils/
    ├── wikiLinks.ts            # Wiki-link parsing, resolution
    ├── frontmatter.ts          # Parse/serialize frontmatter
    ├── paths.ts                # Path utilities
    └── date.ts                 # Date formatting
```

---

## 6. Tauri Commands (Rust Backend)

### 6.1 Backend Structure (`src-tauri/src/`)
```
src-tauri/
├── src/
│   ├── main.rs                 # Entry point, setup
│   ├── commands/               # Tauri commands
│   │   ├── fs.rs               # read_dir, read_file, write_file, watch
│   │   ├── search.rs           # Tantivy: index, search, incremental update
│   │   ├── git.rs              # git2-rs: log, blame, diff, status, diff_file
│   │   ├── templates.rs        # Tera: list, render, create, delete
│   │   ├── export.rs           # Pandoc sidecar: export_to_pdf/html/docx
│   │   ├── schema.rs           # AJV validation via wasm or native json-schema
│   │   └── config.rs           # Load/save/validate config.toml
│   ├── search/
│   │   ├── indexer.rs          # Tantivy indexer (incremental, watch)
│   │   ├── schema.rs           # Tantivy schema definition
│   │   └── query.rs            # Query parser, highlighting
│   ├── templates/
│   │   └── engine.rs           # Tera engine wrapper
│   ├── git/
│   │   └── repo.rs             # Git repo wrapper
│   ├── export/
│   │   └── pandoc.rs           # Pandoc sidecar invocation
│   ├── fs/
│   │   └── watcher.rs          # notify-rs file watcher
│   └── schema/
│       └── validator.rs        # JSON Schema validation (jsonschema crate)
├── Cargo.toml
├── tauri.conf.json
└── build.rs                    # Build pandoc sidecar, copy schemas
```

### 6.2 Main Tauri Commands

| Command | Description | Parameters | Return |
|---------|-------------|------------|--------|
| `fs:read_dir` | Read directory recursively | `path: string, depth?: number` | `FileNode[]` |
| `fs:read_file` | Read file | `path: string` | `{ content: string, frontmatter: object, path: string }` |
| `fs:write_file` | Write file | `path: string, content: string, frontmatter?: object` | `void` |
| `fs:create_file` | Create from template | `path: string, template: string, vars: object` | `FileNode` |
| `fs:delete` | Delete file/folder | `path: string, recursive?: boolean` | `void` |
| `fs:rename` | Rename/move | `from: string, to: string` | `FileNode` |
| `fs:watch` | Watcher events | `path: string` | `Event` (stream) |
| `search:index` | Build/rebuild index | `root: string, force?: boolean` | `IndexStats` |
| `search:search` | Search | `query: string, filters: SearchFilters, limit?: number` | `SearchResult[]` |
| `search:suggest` | Autocomplete | `prefix: string, field?: string` | `string[]` |
| `git:log` | Commit log | `path?: string, limit?: number, since?: string` | `Commit[]` |
| `git:blame` | File blame | `path: string` | `BlameLine[]` |
| `git:diff` | File diff | `path: string, base?: string, head?: string` | `DiffHunk[]` |
| `git:status` | Repo status | `path?: string` | `GitStatus` |
| `templates:list` | List templates | - | `Template[]` |
| `templates:render` | Render template | `name: string, vars: object` | `string` |
| `templates:create` | Create template | `name: string, content: string` | `Template` |
| `templates:delete` | Delete template | `name: string` | `void` |
| `export:to_pdf` | Export to PDF | `paths: string[], options: ExportOptions` | `Blob` |
| `export:to_html` | Export to HTML | `paths: string[], options: ExportOptions` | `string` |
| `schema:validate` | Validate frontmatter | `frontmatter: object, schema: string` | `ValidationResult` |
| `schema:list` | List schemas | - | `string[]` |
| `config:load` | Load config | `project_path?: string` | `Config` |
| `config:save` | Save config | `config: Config` | `void` |
| `graph:build` | Build graph | `root: string` | `GraphData` |

---

## 7. Main Data Flows

### 7.1 App Initialization
```
App Mount
  → Tauri invoke(config:load) → Config
  → fs:read_dir(root) → FileTree
  → search:index status → IndexStatus
  → git:status → GitStatus
  → UI Mount: Sidebar(tree) + Editor(activeFile) + Preview
```

### 7.2 File Open
```
User clicks TreeNode
  → fileStore.setActive(path)
  → fs:read_file(path) → { content, frontmatter }
  → Monaco.setModel(content)
  → schema:validate(frontmatter) → diagnostics
  → wikiLinks:resolve(content) → wikiLinkDiagnostics
  → Preview: markdown-it(content) → HTML
  → SyncScroll.attach(editor, preview)
  → git:blame(path) → inline annotations
```

### 7.3 Search (Cmd+K)
```
User opens SearchModal (Cmd+K)
  → search:suggest("") → recent searches
  → User types query (debounced 150ms)
  → search:search(query, filters) → SearchResult[]
  → Render results with highlights
  → User selects → open file at line
```

### 7.4 Wiki-Link Navigation
```
User Ctrl+Click [[wiki-link]] in editor/preview
  → wikiLinks.resolve("wiki-link", currentFile)
  → If exists: open file at heading
  → If not: offer create from template
  → Update graph view
```

### 7.5 Export
```
User clicks Export
  → ExportDialog: select files, format, template
  → export:to_pdf/html(paths, options)
  → Pandoc sidecar → binary output
  → Save dialog → write file
```

---

## 8. Tantivy Schema (Search Index)

```rust
// Tantivy Schema
schema {
    path: STRING | STORED,          // Relative path
    title: TEXT | STORED,           // Title from frontmatter
    content: TEXT,                  // Markdown content (no frontmatter)
    frontmatter: JSON | STORED,     // Full frontmatter
    type: STRING | STORED | FAST,   // spec type
    status: STRING | STORED | FAST, // status
    tags: STRING | STORED | FAST,   // tags joined
    id: STRING | STORED | FAST,     // spec ID
    updated: DATETIME | STORED | FAST, // For sorting
}
```

**Incremental indexing**: Watcher (notify-rs) → Debounce 500ms → Re-index changed files only.

---

## 9. Wiki-Links & Graph

### Supported Syntax
```
[[wiki-link]]                    # Link to file by title/ID
[[wiki-link|alias]]              # With alias
[[wiki-link#heading]]            # Link to specific heading
[[REQ-001]]                      # By spec ID
```

### Resolution
1. Search by exact `id` in frontmatter
2. Search by exact `title` (case-insensitive)
3. Search by filename (without extension)
4. Fuzzy match if no exact match

### Knowledge Graph
- Nodes: specs (color by type, shape by status)
- Edges: `[[links]]`, `depends_on`, shared `tags`
- Layout: Force-directed (d3-force / react-force-graph)
- Interactions: zoom, pan, click→open, hover→preview, filter by type/status/tags

---

## 10. Templates (Tera/Jinja2)

### Available Variables
```tera
{{ spec_id }}           # Generated: REQ-001, DES-003, etc.
{{ title }}             # User input
{{ date }}              # Today ISO 8601
{{ datetime }}          # Now ISO 8601
{{ author }}            # Git config user.name
{{ project_name }}      # Config project.name
{{ status }}            # Default: draft
{{ version }}           # "0.1.0"
{{ tags | join(", ") }} # Array to string
```

### Template Example (spec.md.tera)
```markdown
---
id: "{{ spec_id }}"
title: "{{ title }}"
type: "requirement"
status: "{{ status | default(value=\"draft\") }}"
priority: "P2"
tags: []
depends_on: []
author: "{{ author }}"
created: "{{ date }}"
updated: "{{ date }}"
version: "0.1.0"
---

# {{ title }}

## Context
<!-- Why is this requirement needed? -->

## Requirement
<!-- Clear, verifiable description -->

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## References
- [[VIS-001]]
```

---

## 11. Export (Pandoc)

### Supported Formats
| Format | Pandoc Command | Template |
|--------|----------------|----------|
| PDF | `pandoc -f markdown -t pdf --pdf-engine=weasyprint` | Eisvogel / custom |
| HTML | `pandoc -f markdown -t html5 --standalone` | Custom CSS |
| DOCX | `pandoc -f markdown -t docx` | Reference docx |
| LaTeX | `pandoc -f markdown -t latex` | Custom template |

### Export Options
- **Scope**: Current file, tree selection, all specs, by tag/status/type
- **Combine**: Merge multiple files into one (with TOC)
- **Template**: Pandoc template selection
- **Metadata**: Inject frontmatter as Pandoc variables

---

## 12. Git Integration

| Feature | Implementation |
|---------|----------------|
| **Status** | `git status --porcelain` → badges in tree |
| **Blame** | `git blame -L start,end -- path` → annotate editor lines |
| **Diff** | `git diff HEAD~1 -- path` → split diff view |
| **Log** | `git log --oneline -20 -- path` → list with diff preview |
| **History** | Timeline view per file |
| **Branch** | Branch selector in status bar |

---

## 13. User Settings

```typescript
interface UserSettings {
  // Editor
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    wordWrap: "on" | "off" | "bounded";
    minimap: boolean;
    lineNumbers: "on" | "off" | "relative";
    vimMode: boolean;
    formatOnSave: boolean;
  };
  
  // Preview
  preview: {
    theme: "github-light" | "github-dark" | "auto";
    syncScroll: boolean;
    mermaid: boolean;
    math: boolean;
    showFrontmatter: boolean;
  };
  
  // Tree
  tree: {
    showHidden: boolean;
    sortBy: "name" | "type" | "modified";
    sortOrder: "asc" | "desc";
    compactFolders: boolean;
  };
  
  // Search
  search: {
    defaultFilters: SearchFilters;
    historySize: number;
  };
  
  // Git
  git: {
    enabled: boolean;
    blameEnabled: boolean;
    autoFetch: boolean;
  };
  
  // Export
  export: {
    defaultFormat: "pdf" | "html" | "docx";
    pandocPath: string;
    defaultTemplate: string;
  };
  
  // App
  app: {
    theme: "light" | "dark" | "system";
    language: "es" | "en";
    autoSave: boolean;
    restoreSession: boolean;
  };
}
```

---

## 14. Implementation Plan (Phases)

### Phase 1: Foundation (Weeks 1-2)
- [x] Setup Tauri + React + TypeScript + Tailwind
- [x] Tauri config: permissions, sidecar (pandoc), build scripts
- [x] App Shell: SplitView (Sidebar + Editor + Preview)
- [ ] File System: Tauri commands fs (read_dir, read, write, **watch**)
- [ ] Virtualized Tree View with **keyboard navigation**
- [x] Monaco Editor + Markdown preview (markdown-it)
- [ ] Config TOML load/save + **JSON Schema validation**
- [ ] Basic **Settings panel**

### Phase 2: Core Markdown & Navigation (Weeks 3-4)
- [ ] Frontmatter parsing (gray-matter) + validation (AJV)
- [ ] Wiki-links: parsing, completion, resolution, navigation
- [ ] Graph view (react-force-graph) with nodes/edges from links
- [ ] Sync scroll editor ↔ preview
- [ ] Mermaid + Math (KaTeX) rendering in preview
- [ ] Diagnostics panel: broken links, schema errors, todos
- [ ] Keyboard shortcuts (Cmd+P, Ctrl+Click, etc.)

### Phase 3: Full-Text Search (Week 5)
- [ ] Tantivy schema + indexer (Rust)
- [ ] Incremental indexing via file watcher
- [ ] Tauri commands: index, search, suggest
- [ ] Search Modal (Cmd+K) with filters, highlights, navigation
- [ ] Search results in sidebar tab

### Phase 4: Git Integration (Week 6)
- [ ] git2-rs commands: status, log, blame, diff
- [ ] Git Panel: tabs Log/Blame/Diff
- [ ] Inline blame annotations in Monaco
- [ ] Diff view (split/unified) with syntax highlighting
- [ ] Status badges in tree view

### Phase 5: Templates & Spec Management (Week 7)
- [ ] Tera engine in Rust
- [ ] Template CRUD commands
- [ ] Template Manager UI (list, edit, delete)
- [ ] New file from template modal with variables
- [ ] Spec ID auto-generation by type
- [ ] Visual schema editor (JSON Schema → form)

### Phase 6: Export & Polish (Week 8)
- [ ] Pandoc sidecar integration
- [ ] Export dialog: scope, format, template, options
- [ ] Export progress with cancellation
- [ ] Export templates (Eisvogel, custom)
- [ ] Batch export (multiple specs → single PDF with TOC)

### Phase 7: UX Polish & Extras (Weeks 9-10)
- [ ] Onboarding / Welcome screen
- [ ] Keyboard shortcuts cheatsheet (Cmd+Shift+P)
- [ ] Global command palette
- [ ] Themes (light/dark/system + custom)
- [ ] Session restore (open files, scroll, tree state)
- [ ] Auto-save + backup
- [ ] Performance: tree virtualization, lazy load preview
- [ ] Tests: unit (Rust), component (Vitest), e2e (Playwright)
- [ ] CI/CD: Build matrix (Windows/macOS/Linux), auto-updater

---

## 15. Tauri Config (tauri.conf.json)

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "package": {
    "productName": "MarkView",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": { "all": true, "scope": ["$APPDATA/MarkView/*", "$PROJECT/*"] },
      "shell": { "all": false, "open": true, "sidecar": true },
      "dialog": { "all": true },
      "notification": { "all": true },
      "window": { "all": false, "close": true, "hide": true, "show": true, "maximize": true, "minimize": true, "unmaximize": true, "unminimize": true },
      "clipboard": { "all": true },
      "path": { "all": true },
      "app": { "all": false, "show": true, "hide": true },
      "protocol": { "all": true, "asset": true, "assetScope": ["$PROJECT/*"] }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "icon": ["icons/icon.png"],
      "externalBin": ["pandoc"],
      "resources": ["schemas/*", "templates/*", "export-templates/*"]
    },
    "security": {
      "csp": "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ipc: http://localhost:1420;"
    },
    "windows": [{
      "label": "main",
      "title": "MarkView",
      "width": 1400,
      "height": 900,
      "minWidth": 1000,
      "minHeight": 700,
      "center": true
    }]
  }
}
```

---

## 16. Key Dependencies

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-fs": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-clipboard-manager": "^2.0.0",
    "@tauri-apps/plugin-notification": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "@monaco-editor/react": "^4.6.0",
    "monaco-editor": "^0.45.0",
    "markdown-it": "^14.0.0",
    "markdown-it-anchor": "^9.0.0",
    "markdown-it-footnote": "^4.0.0",
    "markdown-it-task-lists": "^2.1.1",
    "markdown-it-wikilink": "^1.0.0",
    "markdown-it-mermaid": "^2.0.0",
    "gray-matter": "^4.0.3",
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@tanstack/react-virtual": "^3.0.0",
    "react-force-graph": "^1.43.0",
    "d3-force": "^3.0.0",
    "cmdk": "^0.2.0",
    "react-resizable-panels": "^2.0.0",
    "date-fns": "^3.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/markdown-it": "^13.0.0",
    "@types/gray-matter": "^4.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "playwright": "^1.40.0"
  }
}
```

### Backend (Cargo.toml)
```toml
[package]
name = "markview"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2.0", features = ["fs", "shell", "dialog", "clipboard", "notification", "window", "path", "protocol", "updater"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
serde_toml = "0.8"
thiserror = "1.0"
anyhow = "1.0"
tantivy = "0.20"
notify = "6.0"
git2 = "0.18"
tera = "1.18"
jsonschema = "0.18"
walkdir = "2.3"
glob = "0.3"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
regex = "1.0"
```

---

## 17. Acceptance Criteria (Definition of Done)

| Feature | Criteria |
|---------|----------|
| **Tree View** | Full keyboard navigation, recursive expand/collapse, filtering, virtualization >10k files |
| **Editor** | Monaco with syntax highlight, wiki-link completion, format on save, inline diagnostics |
| **Preview** | markdown-it + mermaid + math render, sync scroll ±50px, light/dark themes |
| **Search** | Index <2s for 10k files, search <100ms, highlights, type/status/tag filters |
| **Wiki-links** | Ctrl+Click navigates, broken link detection, interactive graph view |
| **Frontmatter** | Real-time JSON Schema validation, form editor sidebar, autocomplete |
| **Git** | Inline blame, diff view, log with search, status badges in tree |
| **Templates** | CRUD UI, Tera variables, create file from template with variable modal |
| **Export** | PDF/HTML/DOCX via pandoc, custom templates, batch export with TOC |
| **Config** | TOML + JSON Schema, hot reload, validation, complete settings UI |
| **Performance** | Cold start <2s, memory <300MB, 60fps scroll, search <100ms |
| **Distribution** | Signed binaries Win/macOS/Linux, auto-updater, <50MB |

---

## 18. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tantivy memory on large projects | Medium | High | Streaming index, paging, mmap |
| Pandoc sidecar distribution | Medium | High | Static binary, fallback to HTML-only |
| Monaco editor bundle size | High | Medium | Code splitting, lazy load editor |
| git2-rs cross-platform | Low | High | CI test on 3 OS, git CLI fallback |
| File watcher reliability | Medium | Medium | Polling fallback, debounce |
| Schema validation performance | Low | Medium | Cache AJV schemas, web worker |

---

## 19. Immediate Next Steps

1. **Create repo** with Tauri + React + TypeScript structure
2. **Configure** Tailwind, Monaco, Tauri plugins
3. **Implement** base Tauri commands: fs, config
4. **Build** App Shell + Tree View + Editor + Preview
5. **Integrate** markdown-it + wiki-links + preview
6. **Validate** with real example specs

---

Ready to start **Phase 1** implementation (setup + app shell + file tree + editor/preview)?