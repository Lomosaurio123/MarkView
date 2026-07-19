'use client';

import { useState, useCallback } from 'react';
import { useSearchStore } from '@/store/searchStore';
import { api } from '@/services/api';
import { SearchResult } from '@/types';
import { Loader2, X, FileText, Filter, ChevronDown, ChevronUp, Clock, Tag, GitBranch, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export function SearchPanel() {
  const { query, setQuery, filters, setFilters, results, isSearching, setResults, recentSearches, addRecentSearch } = useSearchStore();
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      const searchResults = await api.search.search(searchQuery, filters, 50);
      setResults(searchResults);
      addRecentSearch(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [filters, setResults, addRecentSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setDebouncedQuery(value);
    
    const timeout = setTimeout(() => {
      handleSearch(value);
    }, 300);
    
    return () => clearTimeout(timeout);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search specs... (Cmd+K)"
            value={debouncedQuery}
            onChange={handleInputChange}
            className="pl-9 pr-9"
            autoFocus
          />
          {debouncedQuery && (
            <button
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn-sm', showFilters && 'bg-primary text-primary-foreground')}
          >
            <Filter className="w-3 h-3 mr-1" />
            Filters
          </button>
          
          {recentSearches.length > 0 && (
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-1 whitespace-nowrap">
                {recentSearches.slice(0, 5).map((search, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(search);
                      setDebouncedQuery(search);
                      handleSearch(search);
                    }}
                    className="btn-sm text-xs px-2"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Type</label>
              <Select value={filters.types?.join(',') || ''} onValueChange={(v) => setFilters({ ...filters, types: v ? v.split(',') : [] })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requirement">Requirement</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="adr">ADR</SelectItem>
                  <SelectItem value="vision">Vision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="label-text">Status</label>
              <Select value={filters.statuses?.join(',') || ''} onValueChange={(v) => setFilters({ ...filters, statuses: v ? v.split(',') : [] })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="implemented">Implemented</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isSearching && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {results.length === 0 && !isSearching && debouncedQuery && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p>No results found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="p-3 space-y-2">
            {results.map((result, index) => (
              <SearchResultItem
                key={`${result.path}-${index}`}
                result={result}
                query={debouncedQuery}
              />
            ))}
          </div>
        )}

        {!debouncedQuery && recentSearches.length > 0 && (
          <div className="p-3 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Recent searches
            </h3>
            {recentSearches.slice(0, 10).map((search, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(search);
                  setDebouncedQuery(search);
                  handleSearch(search);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent text-sm"
              >
                <Clock className="w-4 h-4 inline mr-2 text-muted-foreground" />
                {search}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultItem({ result, query }: { result: SearchResult; query: string }) {
  const highlight = (text: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <button className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors group">
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{highlight(result.title)}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {result.type}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {result.status}
            </span>
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {highlight(result.highlights.content?.[0] || result.path)}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {result.tags.slice(0, 3).join(', ')}
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {result.id}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}