'use client';

import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { SearchPanel } from './SearchPanel';
import { GitPanel } from './GitPanel';
import { TemplatePanel } from './TemplatePanel';
import { GraphPanel } from './GraphPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { X, Search, GitBranch, FileText, GitGraph, ChevronLeft, PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RightSidebar({ onClose }: { onClose?: () => void }) {
  const { activeRightTab, setActiveRightTab, showRightSidebar, toggleRightSidebar } = useUIStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!showRightSidebar || !activeRightTab) return null;

  const tabs = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'git', label: 'Git', icon: GitBranch },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'graph', label: 'Graph', icon: GitGraph },
  ] as const;

  return (
    <div className={cn(
      'flex flex-col h-full bg-card border-l border-border transition-all duration-200',
      collapsed && 'w-12'
    )}>
      <div className="flex items-center justify-between p-2 border-b border-border">
        {!collapsed && (
          <Tabs value={activeRightTab} onValueChange={(v) => setActiveRightTab(v as 'search' | 'git' | 'templates' | 'graph' | null)} className="flex-1">
            <TabsList className="grid grid-cols-4 gap-1 h-8 bg-transparent">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center justify-center gap-1 px-2 py-1 text-xs"
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="btn-icon p-1"
              title="Close sidebar"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              if (collapsed) toggleRightSidebar();
            }}
            className={cn(
              'btn-icon p-1',
              collapsed && 'rotate-180'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          <TabsContent value="search"><SearchPanel /></TabsContent>
          <TabsContent value="git"><GitPanel /></TabsContent>
          <TabsContent value="templates"><TemplatePanel /></TabsContent>
          <TabsContent value="graph"><GraphPanel /></TabsContent>
        </div>
      )}
    </div>
  );
}