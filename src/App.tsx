import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useUIStore } from '@/store/uiStore';
import { useFileStore } from '@/store/fileStore';
import { SplitView } from '@/app/components/layout/SplitView';
import { StatusBar } from '@/app/components/layout/StatusBar';
import { CommandPalette } from '@/components/ui/CommandPalette';

export function App() {
  const { theme } = useUIStore();
  const { initialize } = useFileStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    initialize();

    const unlisten = listen('fs://changed', (_event) => {
      console.log('File changed');
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [initialize]);

  return (
    <div className="relative flex flex-col h-full w-full bg-background">
      <div className="flex-1 h-full pb-10">
        <SplitView />
      </div>

      <StatusBar />

      {/* Theme toggle moved into Sidebar header */}

      <CommandPalette />
    </div>
  );
}