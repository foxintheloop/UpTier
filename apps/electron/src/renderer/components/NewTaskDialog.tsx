import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, Clock, Tag, AlertCircle, Plus, ChevronsUpDown, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandEmpty,
} from './ui/command';
import { cn } from '@/lib/utils';
import { parseTaskInput, type ParsedTask } from '@/lib/nlp-parser';
import type { ListWithCount } from '@uptier/shared';

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultListId: string | null;
  onTaskCreated?: (listId: string) => void;
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-amber-400',
  3: 'text-gray-400',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Do Now',
  2: 'Do Soon',
  3: 'Backlog',
};

export function NewTaskDialog({ open, onOpenChange, defaultListId, onTaskCreated }: NewTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [listPopoverOpen, setListPopoverOpen] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const queryClient = useQueryClient();

  const { data: lists = [] } = useQuery<ListWithCount[]>({
    queryKey: ['lists'],
    queryFn: () => window.electronAPI.lists.getAll(),
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setCreatingList(false);
      setNewListName('');
      if (defaultListId && !defaultListId.startsWith('smart:')) {
        setSelectedListId(defaultListId);
      } else if (lists.length > 0) {
        setSelectedListId(lists[0].id);
      }
    }
  }, [open, defaultListId, lists]);

  const parsed = useMemo<ParsedTask | null>(() => {
    if (!title.trim()) return null;
    return parseTaskInput(title);
  }, [title]);

  const hasTokens = parsed && parsed.tokens.length > 0;

  const createListMutation = useMutation({
    mutationFn: (name: string) => window.electronAPI.lists.create({ name }),
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setSelectedListId(newList.id);
      setNewListName('');
      setCreatingList(false);
      setListPopoverOpen(false);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (p: ParsedTask) => {
      const task = await window.electronAPI.tasks.create({
        list_id: selectedListId,
        title: p.cleanTitle || title.trim(),
        due_date: p.dueDate,
        due_time: p.dueTime,
        priority_tier: p.priorityTier,
        estimated_minutes: p.estimatedMinutes,
      });

      // Create and link tags (same flow as QuickAdd.tsx)
      if (p.tags.length > 0 && task?.id) {
        const existingTags = await window.electronAPI.tags.getAll();
        for (const tagName of p.tags) {
          let tag = existingTags.find(
            (t: { name: string }) => t.name.toLowerCase() === tagName.toLowerCase()
          );
          if (!tag) {
            tag = await window.electronAPI.tags.create({ name: tagName, color: '#6b7280' });
          }
          if (tag?.id) {
            await window.electronAPI.tasks.addTag(task.id, tag.id);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['tags'] });
      }

      return task;
    },
    onSuccess: () => {
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['smartListCounts'] });
      onOpenChange(false);
      onTaskCreated?.(selectedListId);
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !selectedListId) return;
    const p = parseTaskInput(title);
    createTaskMutation.mutate(p);
  };

  const selectedList = lists.find(l => l.id === selectedListId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>
            Use shortcuts: tomorrow, #tag, !1, ~30m
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* List selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">List</label>
            <Popover open={listPopoverOpen} onOpenChange={(popoverOpen) => {
              setListPopoverOpen(popoverOpen);
              if (!popoverOpen) { setCreatingList(false); setNewListName(''); }
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={listPopoverOpen}
                  className="w-full justify-between h-9 text-sm font-normal"
                >
                  <span className="flex items-center gap-2 truncate">
                    {selectedList && (
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: selectedList.color }}
                      />
                    )}
                    {selectedList?.name || 'Select list...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" collisionPadding={8}>
                {creatingList ? (
                  <div className="p-2">
                    <Input
                      autoFocus
                      placeholder="List name"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newListName.trim()) {
                          createListMutation.mutate(newListName.trim());
                        }
                        if (e.key === 'Escape') {
                          setCreatingList(false);
                          setNewListName('');
                        }
                      }}
                      className="h-8 text-sm"
                      disabled={createListMutation.isPending}
                    />
                  </div>
                ) : (
                  <Command>
                    <CommandInput placeholder="Search lists..." />
                    <CommandList className="max-h-[min(300px,var(--radix-popover-content-available-height,300px)-44px)]">
                      <CommandEmpty>No lists found.</CommandEmpty>
                      <CommandGroup>
                        {lists.map((list) => (
                          <CommandItem
                            key={list.id}
                            value={list.name}
                            onSelect={() => {
                              setSelectedListId(list.id);
                              setListPopoverOpen(false);
                            }}
                          >
                            <div
                              className="h-2.5 w-2.5 rounded-full mr-2 shrink-0"
                              style={{ backgroundColor: list.color }}
                            />
                            {list.name}
                            {list.id === selectedListId && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem onSelect={() => setCreatingList(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create new list...
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Task input */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Task</label>
            <Input
              autoFocus
              placeholder="Buy groceries tomorrow #errands !1 ~30m"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) {
                  handleSubmit();
                }
              }}
              disabled={createTaskMutation.isPending}
            />
          </div>

          {/* Token preview */}
          {hasTokens && (
            <div className="flex items-center gap-3 px-1 text-xs text-muted-foreground flex-wrap">
              {parsed.dueDate && (
                <span className="flex items-center gap-1 text-blue-400">
                  <CalendarIcon className="h-3 w-3" />
                  {parsed.tokens.find((t) => t.type === 'date')?.value}
                  {parsed.dueTime && ` ${parsed.dueTime}`}
                </span>
              )}
              {parsed.dueTime && !parsed.dueDate && (
                <span className="flex items-center gap-1 text-blue-400">
                  <Clock className="h-3 w-3" />
                  {parsed.dueTime}
                </span>
              )}
              {parsed.priorityTier && (
                <span className={cn('flex items-center gap-1', PRIORITY_COLORS[parsed.priorityTier])}>
                  <AlertCircle className="h-3 w-3" />
                  {PRIORITY_LABELS[parsed.priorityTier]}
                </span>
              )}
              {parsed.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-purple-400">
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
              {parsed.estimatedMinutes && (
                <span className="flex items-center gap-1 text-green-400">
                  <Clock className="h-3 w-3" />
                  {parsed.estimatedMinutes >= 60
                    ? `${Math.floor(parsed.estimatedMinutes / 60)}h${parsed.estimatedMinutes % 60 > 0 ? ` ${parsed.estimatedMinutes % 60}m` : ''}`
                    : `${parsed.estimatedMinutes}m`}
                </span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !selectedListId || createTaskMutation.isPending}
          >
            {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
