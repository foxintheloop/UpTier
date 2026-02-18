import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarIcon, Clock, Hash, AlertCircle, Plus, ChevronsUpDown, Check, X,
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, startOfDay, parseISO, isToday } from 'date-fns';
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
import { Calendar } from './ui/calendar';
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
import { useFeatures } from '../hooks/useFeatures';
import { PRIORITY_TIERS } from '@uptier/shared';
import type { ListWithCount, Tag, PriorityTier } from '@uptier/shared';

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultListId: string | null;
  onTaskCreated?: (listId: string) => void;
}

// --- Constants ---

const DUE_DATE_PRESETS = [
  { label: 'Today', getValue: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Tomorrow', getValue: () => format(addDays(new Date(), 1), 'yyyy-MM-dd') },
  { label: 'Next Week', getValue: () => format(addWeeks(startOfDay(new Date()), 1), 'yyyy-MM-dd') },
  { label: 'Next Month', getValue: () => format(addMonths(startOfDay(new Date()), 1), 'yyyy-MM-dd') },
];

const DURATION_PRESETS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
  { label: '1h', value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: '4h', value: 240 },
];

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#6b7280',
];

// --- Helpers ---

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function getDateLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  const tomorrow = addDays(startOfDay(new Date()), 1);
  if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) return 'Tomorrow';
  return format(date, 'MMM d');
}

// --- Overrides type ---

interface ToolbarOverrides {
  dueDate?: string | null;
  dueTime?: string | null;
  priorityTier?: PriorityTier | null;
  estimatedMinutes?: number | null;
  tagIds?: string[];
}

// --- Component ---

export function NewTaskDialog({ open, onOpenChange, defaultListId, onTaskCreated }: NewTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [listPopoverOpen, setListPopoverOpen] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [overrides, setOverrides] = useState<ToolbarOverrides>({});

  // Tag picker state
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  // Date picker state
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [timeInput, setTimeInput] = useState('');

  // Duration picker state
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);
  const [customDuration, setCustomDuration] = useState('');

  // Priority picker state
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);

  const queryClient = useQueryClient();
  const features = useFeatures();

  const { data: lists = [] } = useQuery<ListWithCount[]>({
    queryKey: ['lists'],
    queryFn: () => window.electronAPI.lists.getAll(),
  });

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => window.electronAPI.tags.getAll(),
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setOverrides({});
      setCreatingList(false);
      setNewListName('');
      setTimeInput('');
      setCustomDuration('');
      setShowCreateTag(false);
      setNewTagName('');
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

  // Merge NLP-parsed values with toolbar overrides
  const effective = useMemo(() => {
    const p = parsed;
    return {
      dueDate: overrides.dueDate !== undefined ? overrides.dueDate : (p?.dueDate ?? null),
      dueTime: overrides.dueTime !== undefined ? overrides.dueTime : (p?.dueTime ?? null),
      priorityTier: overrides.priorityTier !== undefined ? overrides.priorityTier : (p?.priorityTier ?? null),
      estimatedMinutes: overrides.estimatedMinutes !== undefined ? overrides.estimatedMinutes : (p?.estimatedMinutes ?? null),
    };
  }, [parsed, overrides]);

  // Resolve NLP tag names to existing tag IDs for display
  const effectiveTagIds = useMemo(() => {
    if (overrides.tagIds !== undefined) return overrides.tagIds;
    // Auto-match NLP tags to existing tags by name
    if (!parsed?.tags.length) return [];
    return allTags
      .filter(t => parsed.tags.some(name => name.toLowerCase() === t.name.toLowerCase()))
      .map(t => t.id);
  }, [overrides.tagIds, parsed?.tags, allTags]);

  // NLP tag names that don't match existing tags (will be created on submit)
  const unmatchedNlpTags = useMemo(() => {
    if (overrides.tagIds !== undefined) return []; // picker was used, skip NLP tags
    if (!parsed?.tags.length) return [];
    return parsed.tags.filter(
      name => !allTags.some(t => t.name.toLowerCase() === name.toLowerCase())
    );
  }, [overrides.tagIds, parsed?.tags, allTags]);

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

  const createTagMutation = useMutation({
    mutationFn: (input: { name: string; color: string }) =>
      window.electronAPI.tags.create(input),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setOverrides(prev => ({
        ...prev,
        tagIds: [...(prev.tagIds ?? effectiveTagIds), newTag.id],
      }));
      setNewTagName('');
      setShowCreateTag(false);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (input: {
      createInput: Parameters<typeof window.electronAPI.tasks.create>[0];
      tagIds: string[];
      nlpTagNames: string[];
    }) => {
      const task = await window.electronAPI.tasks.create(input.createInput);

      if (task?.id) {
        // Link explicitly selected tags (from picker)
        for (const tagId of input.tagIds) {
          await window.electronAPI.tasks.addTag(task.id, tagId);
        }

        // Find-or-create NLP tags (for unmatched #tag names)
        if (input.nlpTagNames.length > 0) {
          const existingTags = await window.electronAPI.tags.getAll();
          for (const tagName of input.nlpTagNames) {
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
        }

        if (input.tagIds.length > 0 || input.nlpTagNames.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['tags'] });
        }
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

    createTaskMutation.mutate({
      createInput: {
        list_id: selectedListId,
        title: p.cleanTitle || title.trim(),
        due_date: effective.dueDate ?? undefined,
        due_time: effective.dueTime ?? undefined,
        priority_tier: effective.priorityTier ?? undefined,
        estimated_minutes: effective.estimatedMinutes ?? undefined,
      },
      tagIds: effectiveTagIds,
      nlpTagNames: unmatchedNlpTags,
    });
  };

  const handleToggleTag = (tagId: string) => {
    const current = overrides.tagIds ?? effectiveTagIds;
    const next = current.includes(tagId)
      ? current.filter(id => id !== tagId)
      : [...current, tagId];
    setOverrides(prev => ({ ...prev, tagIds: next }));
  };

  const selectedList = lists.find(l => l.id === selectedListId);
  const totalTagCount = effectiveTagIds.length + unmatchedNlpTags.length;

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

          {/* Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Due Date */}
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors',
                    effective.dueDate
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'text-muted-foreground hover:bg-accent border-transparent'
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {effective.dueDate ? (
                    <>
                      <span>{getDateLabel(effective.dueDate)}</span>
                      {effective.dueTime && (
                        <span className="opacity-70">{effective.dueTime}</span>
                      )}
                      <X
                        className="h-3 w-3 ml-0.5 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOverrides(prev => ({ ...prev, dueDate: null, dueTime: null }));
                          setTimeInput('');
                        }}
                      />
                    </>
                  ) : (
                    <span>Date</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" collisionPadding={8}>
                <div className="flex">
                  {/* Left side: Presets + time */}
                  <div className="border-r border-border p-2 space-y-0.5">
                    {DUE_DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setOverrides(prev => ({ ...prev, dueDate: preset.getValue() }));
                        }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors whitespace-nowrap',
                          effective.dueDate === preset.getValue() && 'bg-accent'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}

                    <div className="border-t border-border my-1" />

                    <button
                      onClick={() => {
                        setOverrides(prev => ({ ...prev, dueDate: null, dueTime: null }));
                        setTimeInput('');
                        setDatePopoverOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors text-muted-foreground"
                    >
                      No due date
                    </button>

                    {effective.dueDate && (
                      <>
                        <div className="border-t border-border my-1" />
                        <div className="px-3 py-1.5 space-y-1">
                          <label className="text-xs text-muted-foreground">Time</label>
                          <input
                            type="time"
                            value={timeInput}
                            onChange={(e) => {
                              setTimeInput(e.target.value);
                              setOverrides(prev => ({
                                ...prev,
                                dueTime: e.target.value || null,
                              }));
                            }}
                            className="w-full text-sm bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right side: Calendar */}
                  <div className="p-2">
                    <Calendar
                      mode="single"
                      selected={effective.dueDate ? parseISO(effective.dueDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setOverrides(prev => ({
                            ...prev,
                            dueDate: format(date, 'yyyy-MM-dd'),
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Priority Tier */}
            {features.priorityTiers && (
              <Popover open={priorityPopoverOpen} onOpenChange={setPriorityPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors',
                      effective.priorityTier
                        ? effective.priorityTier === 1
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : effective.priorityTier === 2
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                        : 'text-muted-foreground hover:bg-accent border-transparent'
                    )}
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {effective.priorityTier ? (
                      <>
                        <span>Tier {effective.priorityTier}</span>
                        <X
                          className="h-3 w-3 ml-0.5 opacity-60 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOverrides(prev => ({ ...prev, priorityTier: null }));
                          }}
                        />
                      </>
                    ) : (
                      <span>Priority</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex gap-2">
                    {([1, 2, 3] as const).map((tier) => {
                      const info = PRIORITY_TIERS[tier];
                      const isSelected = effective.priorityTier === tier;
                      return (
                        <button
                          key={tier}
                          onClick={() => {
                            setOverrides(prev => ({
                              ...prev,
                              priorityTier: isSelected ? null : tier,
                            }));
                            setPriorityPopoverOpen(false);
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors',
                            isSelected
                              ? tier === 1
                                ? 'bg-red-500/20 border-red-500 text-red-400'
                                : tier === 2
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                  : 'bg-gray-500/20 border-gray-500 text-gray-400'
                              : 'border-input hover:bg-accent'
                          )}
                          title={info.label}
                        >
                          Tier {tier}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Tags */}
            <Popover open={tagPopoverOpen} onOpenChange={(o) => {
              setTagPopoverOpen(o);
              if (!o) { setShowCreateTag(false); setNewTagName(''); }
            }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors',
                    totalTagCount > 0
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : 'text-muted-foreground hover:bg-accent border-transparent'
                  )}
                >
                  <Hash className="h-3.5 w-3.5" />
                  {totalTagCount > 0 ? (
                    <>
                      <span>{totalTagCount} tag{totalTagCount !== 1 ? 's' : ''}</span>
                      <X
                        className="h-3 w-3 ml-0.5 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOverrides(prev => ({ ...prev, tagIds: [] }));
                        }}
                      />
                    </>
                  ) : (
                    <span>Tags</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                {/* Tag list */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allTags.length === 0 && !showCreateTag ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No tags yet. Create one!
                    </p>
                  ) : (
                    allTags.map((tag) => {
                      const isSelected = effectiveTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleToggleTag(tag.id)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors',
                            isSelected && 'bg-accent'
                          )}
                        >
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1 text-left">{tag.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })
                  )}

                  {/* Show unmatched NLP tags */}
                  {unmatchedNlpTags.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-purple-400"
                    >
                      <div className="h-3 w-3 rounded-full shrink-0 bg-gray-500" />
                      <span className="flex-1 text-left">{name}</span>
                      <span className="text-xs opacity-60">new</span>
                    </div>
                  ))}
                </div>

                {/* Create new tag */}
                {showCreateTag ? (
                  <div className="mt-2 pt-2 border-t border-border space-y-2">
                    <Input
                      autoFocus
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagName.trim()) {
                          createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
                        }
                        if (e.key === 'Escape') {
                          setShowCreateTag(false);
                          setNewTagName('');
                        }
                      }}
                      className="h-8"
                    />
                    <div className="flex flex-wrap gap-1">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewTagColor(color)}
                          className={cn(
                            'h-5 w-5 rounded-full transition-transform',
                            newTagColor === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setShowCreateTag(false); setNewTagName(''); }}
                        className="flex-1 h-7"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor })}
                        disabled={!newTagName.trim() || createTagMutation.isPending}
                        className="flex-1 h-7"
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateTag(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 mt-2 pt-2 border-t border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create new tag</span>
                  </button>
                )}
              </PopoverContent>
            </Popover>

            {/* Duration */}
            <Popover open={durationPopoverOpen} onOpenChange={setDurationPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors',
                    effective.estimatedMinutes
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : 'text-muted-foreground hover:bg-accent border-transparent'
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {effective.estimatedMinutes ? (
                    <>
                      <span>{formatDuration(effective.estimatedMinutes)}</span>
                      <X
                        className="h-3 w-3 ml-0.5 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOverrides(prev => ({ ...prev, estimatedMinutes: null }));
                        }}
                      />
                    </>
                  ) : (
                    <span>Duration</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="grid grid-cols-2 gap-1">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        setOverrides(prev => ({ ...prev, estimatedMinutes: preset.value }));
                        setDurationPopoverOpen(false);
                      }}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors text-left',
                        effective.estimatedMinutes === preset.value && 'bg-accent'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="border-t border-border mt-2 pt-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="Custom min"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt(customDuration, 10);
                          if (val > 0) {
                            setOverrides(prev => ({ ...prev, estimatedMinutes: val }));
                            setCustomDuration('');
                            setDurationPopoverOpen(false);
                          }
                        }
                      }}
                      className="h-7 text-sm"
                      min={1}
                      max={480}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={!customDuration || parseInt(customDuration, 10) < 1}
                      onClick={() => {
                        const val = parseInt(customDuration, 10);
                        if (val > 0) {
                          setOverrides(prev => ({ ...prev, estimatedMinutes: val }));
                          setCustomDuration('');
                          setDurationPopoverOpen(false);
                        }
                      }}
                    >
                      Set
                    </Button>
                  </div>
                </div>

                {effective.estimatedMinutes && (
                  <button
                    onClick={() => {
                      setOverrides(prev => ({ ...prev, estimatedMinutes: null }));
                      setDurationPopoverOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors text-muted-foreground mt-1"
                  >
                    No duration
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
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
