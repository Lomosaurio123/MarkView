import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarWidth: number;
  rightSidebarWidth: number;
  activeRightTab: 'search' | 'git' | 'templates' | 'graph' | null;
  showRightSidebar: boolean;
  commandPaletteOpen: boolean;
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setActiveRightTab: (tab: 'search' | 'git' | 'templates' | 'graph' | null) => void;
  toggleRightSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarWidth: 280,
      rightSidebarWidth: 320,
      activeRightTab: null,
      showRightSidebar: false,
      commandPaletteOpen: false,

      setTheme: (theme) => set({ theme }),
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),
      setRightSidebarWidth: (width) => set({ rightSidebarWidth: Math.max(250, Math.min(600, width)) }),
      setActiveRightTab: (tab) => set({ activeRightTab: tab, showRightSidebar: !!tab }),
      toggleRightSidebar: () => set((state) => ({ showRightSidebar: !state.showRightSidebar })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'markview-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarWidth: state.sidebarWidth,
        rightSidebarWidth: state.rightSidebarWidth,
      }),
    }
  )
);