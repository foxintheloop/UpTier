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
  ChevronLeft,
  Database,
  Check,
  Trash2,
  MoreVertical,
  Pencil,
  PanelLeftClose,
  PanelLeft,
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 256;

const SMART_LISTS = [
  { id: 'smart:my_day', name: 'My Day', icon: Sun, color: '#f59e0b' },
  { id: 'smart:important', name: 'Important', icon: Star, color: '#ef4444' },
  { id: 'smart:planned', name: 'Planned', icon: Calendar, color: '#3b82f6' },
  { id: 'smart:completed', name: 'Completed', icon: CheckCircle2, color: '#22c55e' },
];

export function Sidebar({ selectedListId, onSelectList, onSettingsClick, onDatabaseSwitch, collapsed = false, onToggleCollapse, width = DEFAULT_SIDEBAR_WIDTH, onWidthChange }: SidebarProps) {
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listsExpanded, setListsExpanded] = useState(true);
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [dbDropdownOpen, setDbDropdownOpen] = useState(false);
  const [showNewDb, setShowNewDb] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [listMenuOpen, setListMenuOpen] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

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

  const updateListMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      window.electronAPI.lists.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setEditingListId(null);
      setEditingListName('');
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI.lists.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      // If deleted list was selected, select first available list or smart list
      if (selectedListId === deletedId) {
        const remainingLists = lists.filter((l) => l.id !== deletedId);
        if (remainingLists.length > 0) {
          onSelectList(remainingLists[0].id);
        } else {
          onSelectList('smart:my_day');
        }
      }
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

  const handleStartRename = (list: ListWithCount) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
    setListMenuOpen(null);
  };

  const handleRenameList = (listId: string) => {
    if (editingListName.trim() && editingListName.trim() !== lists.find(l => l.id === listId)?.name) {
      updateListMutation.mutate({ id: listId, name: editingListName.trim() });
    } else {
      setEditingListId(null);
      setEditingListName('');
    }
  };

  const handleDeleteList = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setListMenuOpen(null);
    if (window.confirm('Delete this list? Tasks in this list will be moved to the default list.')) {
      deleteListMutation.mutate(id);
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

  // Close list menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.list-menu')) {
        setListMenuOpen(null);
      }
    };
    if (listMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [listMenuOpen]);

  // Handle sidebar resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, onWidthChange]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <div
      className={cn(
        "bg-secondary/30 border-r border-border flex flex-col h-full relative",
        collapsed && "w-14",
        !isResizing && "transition-all duration-200"
      )}
      style={!collapsed ? { width: `${width}px` } : undefined}
    >
      {/* Resize Handle */}
      {!collapsed && (
        <div
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 hover:bg-primary/30 transition-colors",
            isResizing && "bg-primary/50"
          )}
          onMouseDown={handleResizeStart}
        />
      )}
      {/* Header */}
      <div className={cn("border-b border-border", collapsed ? "p-2" : "p-4")}>
        <div className="flex items-center justify-between">
          {!collapsed && <h1 className="text-xl font-bold text-primary">UpTier</h1>}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "p-1.5 rounded-md hover:bg-accent transition-colors",
                collapsed && "mx-auto"
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Database Switcher */}
        {!collapsed && (
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
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className={cn("p-2", collapsed && "px-1")}>
          {/* Smart Lists */}
          <div className="mb-4">
            {SMART_LISTS.map((smartList) => (
              <button
                key={smartList.id}
                onClick={() => onSelectList(smartList.id)}
                className={cn(
                  'w-full flex items-center rounded-md text-sm transition-colors',
                  collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
                  selectedListId === smartList.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50 text-muted-foreground'
                )}
                title={collapsed ? smartList.name : undefined}
              >
                <smartList.icon
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: smartList.color }}
                />
                {!collapsed && <span>{smartList.name}</span>}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="border-t border-border my-2" />

          {/* User Lists */}
          <div className="mb-4">
            {!collapsed && (
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
            )}

            {(collapsed || listsExpanded) && (
              <div className={cn(!collapsed && "ml-2")}>
                {lists.map((list) => (
                  <div key={list.id} className="group relative list-menu">
                    {editingListId === list.id && !collapsed ? (
                      <div className="px-3 py-2">
                        <Input
                          autoFocus
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameList(list.id);
                            if (e.key === 'Escape') {
                              setEditingListId(null);
                              setEditingListName('');
                            }
                          }}
                          onBlur={() => handleRenameList(list.id)}
                          className="h-8 text-sm"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => onSelectList(list.id)}
                        className={cn(
                          'w-full flex items-center rounded-md text-sm transition-colors cursor-pointer',
                          collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
                          selectedListId === list.id
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50 text-muted-foreground'
                        )}
                        title={collapsed ? list.name : undefined}
                      >
                        <div
                          className={cn("rounded-sm flex-shrink-0", collapsed ? "h-4 w-4" : "h-3 w-3")}
                          style={{ backgroundColor: list.color }}
                        />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left truncate">{list.name}</span>
                            {list.incomplete_count > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {list.incomplete_count}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setListMenuOpen(listMenuOpen === list.id ? null : list.id);
                              }}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Dropdown Menu */}
                    {listMenuOpen === list.id && (
                      <div className="absolute right-2 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden min-w-[120px]">
                        <button
                          onClick={() => handleStartRename(list)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => handleDeleteList(e, list.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-destructive transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* New List Input */}
                {!collapsed && (
                  showNewList ? (
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
                  )
                )}
                {collapsed && (
                  <button
                    onClick={() => {
                      if (onToggleCollapse) onToggleCollapse();
                      setShowNewList(true);
                    }}
                    className="w-full flex items-center justify-center p-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    title="New List"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-border my-2" />

          {/* Goals */}
          <div>
            {collapsed ? (
              <button
                className="w-full flex items-center justify-center p-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                title="Goals (Coming soon)"
              >
                <Target className="h-4 w-4" />
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className={cn("border-t border-border", collapsed ? "p-1" : "p-2")}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full",
            collapsed ? "justify-center p-2" : "justify-start gap-2"
          )}
          onClick={onSettingsClick}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && "Settings"}
        </Button>
      </div>
    </div>
  );
}
