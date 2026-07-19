"use client";

import * as React from "react";
import { useKeyDown } from "@/hooks";
import { invoke } from "@tauri-apps/api/core";
import { Search, FileText, Folder, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileStore } from "@/store/fileStore";
import { useUIStore } from "@/store/uiStore";
import type { OpenFile } from "@/store/fileStore";

interface SearchResult {
  path: string;
  title: string;
  type: string;
  highlights: string[];
  score: number;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const { openFile } = useFileStore();
  const { setActiveRightTab } = useUIStore();

  useKeyDown("k", (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      setIsOpen((prev) => !prev);
      if (!isOpen) {
        setQuery("");
        setResults([]);
        setSelectedIndex(0);
      }
    }
  });

  useKeyDown("Escape", () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  });

  useKeyDown("ArrowDown", (e: KeyboardEvent) => {
    if (!isOpen) return;
    e.preventDefault();
    setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
  });

  useKeyDown("ArrowUp", (e: KeyboardEvent) => {
    if (!isOpen) return;
    e.preventDefault();
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  });

  useKeyDown("Enter", (e: KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    e.preventDefault();
    const selected = results[selectedIndex];
    if (selected) {
      openFile({
        path: selected.path,
        content: '',
        frontmatter: {},
        dirty: false,
      });
      setIsOpen(false);
      setQuery("");
      setResults([]);
    }
  });

  React.useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const searchResults = await invoke<SearchResult[]>("search:search", {
          query,
          filters: {},
          limit: 20,
        });
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-2xl bg-background border border-border shadow-lg rounded-md overflow-hidden">
        <div className="relative flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search specs... (type to search, Enter to open)"
            className="flex-1 bg-transparent outline-none text-lg placeholder:text-muted-foreground"
            autoFocus
          />
          {isLoading && <div className="w-5 h-5 animate-spin border-2 border-primary border-t-transparent rounded-full" />}
          <button onClick={() => { setQuery(""); setResults([]); }} className="p-1 hover:bg-accent rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 && query.trim() && !isLoading && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
          {results.length === 0 && !query.trim() && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              Type to search specifications...
            </div>
          )}
          <div className="divide-y divide-border">
            {results.map((result, index) => (
              <button
                key={result.path}
                onClick={() => {
                  openFile({
                    path: result.path,
                    content: '',
                    frontmatter: {},
                    dirty: false,
                  });
                  setIsOpen(false);
                  setQuery("");
                  setResults([]);
                }}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors",
                  index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex-shrink-0 w-6 h-6 flex items-center justify-center", result.type === "folder" ? "text-blue-500" : "text-green-500")}>
                    {result.type === "folder" ? <Folder className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title || result.path}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.path}</div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {result.score.toFixed(2)}
                  </div>
                </div>
                {result.highlights.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {result.highlights.map((h, i) => (
                      <span key={i} className="bg-yellow-200">{h}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}