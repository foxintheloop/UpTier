import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sun,
  Star,
  Calendar,
  CheckCircle2,
  List,
  Plus,
  Target,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import type { ListWithCount } from '@uptier/shared';

interface SidebarProps {
  selectedListId: string | null;
  onSelectList: (id: string) => void;
  onSettingsClick: () => void;
}

const SMART_LISTS = [
  { id: 'smart:my_day', name: 'My Day', icon: Sun, color: '#f59e0b' },
  { id: 'smart:important', name: 'Important', icon: Star, color: '#ef4444' },
  { id: 'smart:planned', name: 'Planned', icon: Calendar, color: '#3b82f6' },
  { id: 'smart:completed', name: 'Completed', icon: CheckCircle2, color: '#22c55e' },
];

export function Sidebar({ selectedListId, onSelectList, onSettingsClick }: SidebarProps) {
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listsExpanded, setListsExpanded] = useState(true);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  const queryClient = useQueryClient();

  const { data: lists = [] } = useQuery<ListWithCount[]>({
    queryKey: ['lists'],
    queryFn: () => window.electronAPI.lists.getAll(),
  });

  const createListMutation = useMutation({
    mutationFn: (name: string) => window.electronAPI.lists.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setNewListName('');
      setShowNewList(false);
    },
  });

  const handleCreateList = () => {
    if (newListName.trim()) {
      createListMutation.mutate(newListName.trim());
    }
  };

  return (
    <div className="w-64 bg-secondary/30 border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-primary">UpTier</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Smart Lists */}
          <div className="mb-4">
            {SMART_LISTS.map((smartList) => (
              <button
                key={smartList.id}
                onClick={() => onSelectList(smartList.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  selectedListId === smartList.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50 text-muted-foreground'
                )}
              >
                <smartList.icon
                  className="h-4 w-4"
                  style={{ color: smartList.color }}
                />
                <span>{smartList.name}</span>
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="border-t border-border my-2" />

          {/* User Lists */}
          <div className="mb-4">
            <button
              onClick={() => setListsExpanded(!listsExpanded)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {listsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <List className="h-4 w-4" />
              <span>Lists</span>
            </button>

            {listsExpanded && (
              <div className="ml-2">
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => onSelectList(list.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      selectedListId === list.id
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50 text-muted-foreground'
                    )}
                  >
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: list.color }}
                    />
                    <span className="flex-1 text-left truncate">{list.name}</span>
                    {list.incomplete_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {list.incomplete_count}
                      </span>
                    )}
                  </button>
                ))}

                {/* New List Input */}
                {showNewList ? (
                  <div className="px-3 py-2">
                    <Input
                      autoFocus
                      placeholder="List name"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateList();
                        if (e.key === 'Escape') {
                          setShowNewList(false);
                          setNewListName('');
                        }
                      }}
                      onBlur={() => {
                        if (!newListName.trim()) {
                          setShowNewList(false);
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewList(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New List</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-border my-2" />

          {/* Goals */}
          <div>
            <button
              onClick={() => setGoalsExpanded(!goalsExpanded)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {goalsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Target className="h-4 w-4" />
              <span>Goals</span>
            </button>

            {goalsExpanded && (
              <div className="ml-2 px-3 py-2 text-sm text-muted-foreground">
                <p>Coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onSettingsClick}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
