import { useState, useEffect } from 'react';
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
  Database,
  Check,
  Trash2,
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import type { ListWithCount } from '@uptier/shared';

interface DatabaseProfile {
  id: string;
  name: string;
  path: string;
  color: string;
  icon: string;
  createdAt: string;
}

interface SidebarProps {
  selectedListId: string | null;
  onSelectList: (id: string) => void;
  onSettingsClick: () => void;
  onDatabaseSwitch?: () => void;
}

const SMART_LISTS = [
  { id: 'smart:my_day', name: 'My Day', icon: Sun, color: '#f59e0b' },
  { id: 'smart:important', name: 'Important', icon: Star, color: '#ef4444' },
  { id: 'smart:planned', name: 'Planned', icon: Calendar, color: '#3b82f6' },
  { id: 'smart:completed', name: 'Completed', icon: CheckCircle2, color: '#22c55e' },
];

export function Sidebar({ selectedListId, onSelectList, onSettingsClick, onDatabaseSwitch }: SidebarProps) {
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listsExpanded, setListsExpanded] = useState(true);
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [dbDropdownOpen, setDbDropdownOpen] = useState(false);
  const [showNewDb, setShowNewDb] = useState(false);
  const [newDbName, setNewDbName] = useState('');

  const queryClient = useQueryClient();

  const { data: lists = [] } = useQuery<ListWithCount[]>({
    queryKey: ['lists'],
    queryFn: () => window.electronAPI.lists.getAll(),
  });

  const { data: dbProfiles = [] } = useQuery<DatabaseProfile[]>({
    queryKey: ['database-profiles'],
    queryFn: () => window.electronAPI.database.getProfiles(),
  });

  const { data: activeDbProfile } = useQuery<DatabaseProfile>({
    queryKey: ['database-active'],
    queryFn: () => window.electronAPI.database.getActiveProfile(),
  });

  const createListMutation = useMutation({
    mutationFn: (name: string) => window.electronAPI.lists.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setNewListName('');
      setShowNewList(false);
    },
  });

  const createDbMutation = useMutation({
    mutationFn: (name: string) => window.electronAPI.database.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-profiles'] });
      setNewDbName('');
      setShowNewDb(false);
    },
  });

  const switchDbMutation = useMutation({
    mutationFn: (profileId: string) => window.electronAPI.database.switch(profileId),
    onSuccess: () => {
      // Invalidate all queries after database switch
      queryClient.invalidateQueries();
      setDbDropdownOpen(false);
      onDatabaseSwitch?.();
    },
  });

  const deleteDbMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI.database.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-profiles'] });
    },
  });

  const handleCreateList = () => {
    if (newListName.trim()) {
      createListMutation.mutate(newListName.trim());
    }
  };

  const handleCreateDb = () => {
    if (newDbName.trim()) {
      createDbMutation.mutate(newDbName.trim());
    }
  };

  const handleSwitchDb = (profileId: string) => {
    if (profileId !== activeDbProfile?.id) {
      switchDbMutation.mutate(profileId);
    }
  };

  const handleDeleteDb = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this database profile? This will not delete the database file.')) {
      deleteDbMutation.mutate(id);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.db-switcher')) {
        setDbDropdownOpen(false);
      }
    };
    if (dbDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dbDropdownOpen]);

  return (
    <div className="w-64 bg-secondary/30 border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-primary">UpTier</h1>

        {/* Database Switcher */}
        <div className="db-switcher relative mt-2">
          <button
            onClick={() => setDbDropdownOpen(!dbDropdownOpen)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs bg-secondary/50 hover:bg-secondary border border-border transition-colors"
          >
            <Database className="h-3 w-3" style={{ color: activeDbProfile?.color || '#6366f1' }} />
            <span className="flex-1 text-left truncate text-muted-foreground">
              {activeDbProfile?.name || 'Default'}
            </span>
            <ChevronDown className={cn('h-3 w-3 transition-transform', dbDropdownOpen && 'rotate-180')} />
          </button>

          {dbDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                {dbProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleSwitchDb(profile.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors',
                      profile.id === activeDbProfile?.id && 'bg-accent/50'
                    )}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: profile.color }}
                    />
                    <span className="flex-1 text-left truncate">{profile.name}</span>
                    {profile.id === activeDbProfile?.id && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                    {profile.id !== 'default' && profile.id !== activeDbProfile?.id && (
                      <button
                        onClick={(e) => handleDeleteDb(e, profile.id)}
                        className="p-0.5 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-border p-2">
                {showNewDb ? (
                  <Input
                    autoFocus
                    placeholder="Database name"
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateDb();
                      if (e.key === 'Escape') {
                        setShowNewDb(false);
                        setNewDbName('');
                      }
                    }}
                    onBlur={() => {
                      if (!newDbName.trim()) {
                        setShowNewDb(false);
                      }
                    }}
                    className="h-7 text-xs"
                  />
                ) : (
                  <button
                    onClick={() => setShowNewDb(true)}
                    className="w-full flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    New Database
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
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
