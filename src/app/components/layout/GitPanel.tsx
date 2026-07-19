'use client';

import { useState } from 'react';
import { useFileStore } from '@/store/fileStore';
import { api } from '@/services/api';
import { Commit, BlameLine, DiffHunk } from '@/types';
import { Loader2, ChevronDown, ChevronUp, FileText, GitBranch, Copy, Download, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function GitPanel() {
  const { activeFilePath } = useFileStore();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [blame, setBlame] = useState<BlameLine[]>([]);
  const [diff, setDiff] = useState<DiffHunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'blame' | 'diff'>('log');
  const [logFilter, setLogFilter] = useState('');

  const loadGitData = async () => {
    if (!activeFilePath) return;
    
    setIsLoading(true);
    try {
      const [logData, blameData, diffData] = await Promise.all([
        api.git.log(activeFilePath, 50),
        api.git.blame(activeFilePath),
        api.git.diff(activeFilePath),
      ]);
      setCommits(logData);
      setBlame(blameData);
      setDiff(diffData);
    } catch (error) {
      console.error('Failed to load git data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCommits = commits.filter(c => 
    c.message.toLowerCase().includes(logFilter.toLowerCase()) ||
    c.author.toLowerCase().includes(logFilter.toLowerCase()) ||
    c.hash.substring(0, 7).includes(logFilter)
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b border-border">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'log' | 'blame' | 'diff')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="log">
              <GitBranch className="w-4 h-4 mr-1" />
              Log
            </TabsTrigger>
            <TabsTrigger value="blame">
              <FileText className="w-4 h-4 mr-1" />
              Blame
            </TabsTrigger>
            <TabsTrigger value="diff">
              <GitBranch className="w-4 h-4 mr-1" />
              Diff
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="log">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter commits..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="pl-9 pr-9"
              />
              {logFilter && (
                <button
                  onClick={() => setLogFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCommits.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                No commits found
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredCommits.map((commit) => (
                  <GitCommitItem key={commit.hash} commit={commit} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="blame">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : blame.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                No blame data
              </div>
            ) : (
              <div className="font-mono text-sm space-y-1">
                {blame.map((line, i) => (
                  <div key={i} className="flex items-start gap-3 px-2 py-1 hover:bg-accent rounded">
                    <span className="text-muted-foreground w-8 text-right select-none">
                      {line.line}
                    </span>
                    <span className="text-muted-foreground w-20 text-right select-none font-normal">
                      {line.hash.substring(0, 7)}
                    </span>
                    <span className="text-muted-foreground w-24 select-none truncate">
                      {line.author}
                    </span>
                    <span className="text-muted-foreground w-28 select-none">
                      {new Date(line.date).toLocaleDateString()}
                    </span>
                    <span className="flex-1 text-foreground select-none">
                      {line.summary}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="diff">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : diff.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                No changes
              </div>
            ) : (
              <div className="font-mono text-sm space-y-2">
                {diff.map((hunk, hunkIndex) => (
                  <div key={hunkIndex} className="space-y-1">
                    <div className="px-2 py-1 bg-muted rounded-t text-xs text-muted-foreground">
                      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                    </div>
                    {hunk.lines.map((line, lineIndex) => (
                      <div
                        key={lineIndex}
                        className={cn(
                          'px-2 py-0.5 flex',
                          line.type === 'add' && 'bg-green-500/10 text-green-600 dark:text-green-400',
                          line.type === 'delete' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                          line.type === 'context' && 'text-muted-foreground'
                        )}
                      >
                        <span className="w-8 text-right text-muted-foreground/50 select-none">
                          {line.oldLineNumber || ' '}
                        </span>
                        <span className="w-8 text-right text-muted-foreground/50 select-none">
                          {line.newLineNumber || ' '}
                        </span>
                        <span className="flex-1 whitespace-pre">{line.content}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </div>
    </div>
  );
}

function GitCommitItem({ commit }: { commit: Commit }) {
  return (
    <div className="p-3 rounded-lg hover:bg-accent transition-colors group">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-primary">{commit.hash.substring(0, 7)}</span>
            <span className="text-sm font-medium truncate">{commit.message.split('\n')[0]}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {commit.author}
            </span>
            <span>{new Date(commit.date).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}