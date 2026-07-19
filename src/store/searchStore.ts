import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SearchResult, SearchFilters } from '@/types';

interface SearchState {
  query: string;
  setQuery: (query: string) => void;
  
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  
  results: SearchResult[];
  setResults: (results: SearchResult[]) => void;
  
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      query: '',
      setQuery: (query) => set({ query }),
      
      filters: {},
      setFilters: (filters) => set({ filters }),
      
      results: [],
      setResults: (results) => set({ results }),
      
      isSearching: false,
      setIsSearching: (searching) => set({ isSearching: searching }),
      
      recentSearches: [],
      addRecentSearch: (query) => {
        if (!query.trim()) return;
        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter(s => s !== query),
          ].slice(0, 20),
        }));
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'markview-search',
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        filters: state.filters,
      }),
    }
  )
);