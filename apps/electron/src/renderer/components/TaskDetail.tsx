import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, CalendarIcon, Clock, Target, Zap, Gem, AlertCircle, MessageSquare, Hash, Sparkles, CalendarPlus, ListPlus, LayoutList, Loader2, Check, Trash2, Play, ChevronDown, Repeat, Battery, BatteryMedium, BatteryFull } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { TagPicker } from './TagPicker';
import { TagBadge } from './TagBadge';
import { GoalPicker } from './GoalPicker';
import { SubtaskList } from './SubtaskList';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import type { TaskWithGoals, UpdateTaskInput, ListWithCount } from '@uptier/shared';

const FOCUS_DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
];
import { PRIORITY_SCALES, PRIORITY_TIERS } from '@uptier/shared';
import { format, parseISO, addDays, addWeeks, addMonths, isPast, isToday, startOfDay } from 'date-fns';
import { Calendar } from './ui/calendar';

// Helper to parse UTC timestamps from database (stored without 'Z' indicator)
const parseUTCTimestamp = (timestamp: string) => parseISO(timestamp.replace(' ', 'T') + 'Z');

interface TaskDetailProps {
  task: TaskWithGoals;
  onClose: () => void;
  onUpdate: (task: TaskWithGoals) => void;
  onStartFocus?: (task: TaskWithGoals, durationMinutes: number) => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

const MIN_DETAIL_WIDTH = 300;
const MAX_DETAIL_WIDTH = 600;

interface DueDateSuggestion {
  suggestedDate: string;
  confidence: number;
  reasoning: string;
  basedOn: string[];
}

interface SubtaskSuggestion {
  title: string;
  estimatedMinutes?: number;
}

interface BreakdownSuggestion {
  subtasks: SubtaskSuggestion[];
  totalEstimatedMinutes: number;
  reasoning: string;
}

export function TaskDetail({ task, onClose, onUpdate, onStartFocus, width, onWidthChange }: TaskDetailProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const [showDueDateSuggestion, setShowDueDateSuggestion] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const [focusPopoverOpen, setFocusPopoverOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showBreakdownSuggestion, setShowBreakdownSuggestion] = useState(false);
  const [dueDateSuggestion, setDueDateSuggestion] = useState<DueDateSuggestion | null>(null);
  const [breakdownSuggestion, setBreakdownSuggestion] = useState<BreakdownSuggestion | null>(null);
  const [loadingDueDate, setLoadingDueDate] = useState(false);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const queryClient = useQueryClient();

  const { data: lists = [] } = useQuery<ListWithCount[]>({
    queryKey: ['lists'],
    queryFn: () => window.electronAPI.lists.getAll(),
  });
  const taskList = lists.find(l => l.id === task.list_id);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || '');
    // Reset suggestions when task changes
    setShowDueDateSuggestion(false);
    setShowBreakdownSuggestion(false);
    setDueDateSuggestion(null);
    setBreakdownSuggestion(null);
  }, [task.id, task.title, task.notes]);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_DETAIL_WIDTH, Math.max(MIN_DETAIL_WIDTH, window.innerWidth - e.clientX));
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

  const updateMutation = useMutation({
    mutationFn: (input: UpdateTaskInput) => window.electronAPI.tasks.update(task.id, input),
    onSuccess: (updated) => {
      if (updated) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        onUpdate({ ...task, ...updated });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => window.electronAPI.tasks.delete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onClose();
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Delete "${task.title}"? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const handleTitleBlur = () => {
    if (title !== task.title && title.trim()) {
      updateMutation.mutate({ title: title.trim() });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== (task.notes || '')) {
      updateMutation.mutate({ notes: notes || null });
    }
  };

  const handleTagsChange = () => {
    // Invalidate tasks query to refresh task data with updated tags
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleGoalsChange = () => {
    // Invalidate tasks and goals queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  };

  const handleGetDueDateSuggestion = async () => {
    setLoadingDueDate(true);
    setShowDueDateSuggestion(true);
    try {
      const suggestion = await window.electronAPI.suggestions.getDueDate(task.id);
      setDueDateSuggestion(suggestion);
    } finally {
      setLoadingDueDate(false);
    }
  };

  const handleApplyDueDateSuggestion = async () => {
    if (dueDateSuggestion) {
      await updateMutation.mutateAsync({ due_date: dueDateSuggestion.suggestedDate });
      setShowDueDateSuggestion(false);
      setDueDateSuggestion(null);
    }
  };

  const handleGetBreakdownSuggestion = async () => {
    setLoadingBreakdown(true);
    setShowBreakdownSuggestion(true);
    try {
      const suggestion = await window.electronAPI.suggestions.getBreakdown(task.id);
      setBreakdownSuggestion(suggestion);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleApplyBreakdownSuggestion = async () => {
    if (breakdownSuggestion) {
      // Add subtasks
      for (const subtask of breakdownSuggestion.subtasks) {
        await window.electronAPI.subtasks.add(task.id, subtask.title);
      }
      // Update estimated minutes on parent task
      await updateMutation.mutateAsync({ estimated_minutes: breakdownSuggestion.totalEstimatedMinutes });
      queryClient.invalidateQueries({ queryKey: ['subtasks', task.id] });
      setShowBreakdownSuggestion(false);
      setBreakdownSuggestion(null);
      toast.success(`Added ${breakdownSuggestion.subtasks.length} subtasks`);
    }
  };

  const tierInfo = task.priority_tier ? PRIORITY_TIERS[task.priority_tier] : null;

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-background relative",
        !isResizing && "transition-all duration-200"
      )}
      style={width ? { width: `${width}px` } : undefined}
    >
      {/* Resize Handle */}
      <div
        className={cn(
          "absolute top-0 left-0 w-1 h-full cursor-col-resize z-10 hover:bg-primary/30 transition-colors",
          isResizing && "bg-primary/50"
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium">Task Details</h3>
        <div className="flex items-center gap-2">
          {/* Focus Button with Duration Picker */}
          {!task.completed && onStartFocus && (
            <Popover open={focusPopoverOpen} onOpenChange={setFocusPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Play className="h-4 w-4" />
                  Focus
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1">
                  {FOCUS_DURATIONS.map((duration) => (
                    <Button
                      key={duration.value}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setFocusPopoverOpen(false);
                        onStartFocus(task, duration.value);
                      }}
                    >
                      {duration.label}
                    </Button>
                  ))}
                  <div className="pt-1 border-t border-border mt-1">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Custom"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        className="h-8 text-sm"
                        min={1}
                        max={480}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        disabled={!customDuration || parseInt(customDuration) < 1}
                        onClick={() => {
                          const duration = parseInt(customDuration);
                          if (duration >= 1) {
                            setFocusPopoverOpen(false);
                            onStartFocus(task, duration);
                            setCustomDuration('');
                          }
                        }}
                      >
                        Go
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-lg font-medium border-0 px-0 focus-visible:ring-0"
              placeholder="Task title"
            />
          </div>

          {/* List */}
          {taskList && (
            <div className="flex items-center gap-2 text-sm">
              <LayoutList className="h-4 w-4" />
              <span className="font-medium">List</span>
              <div
                className="h-2.5 w-2.5 rounded-full flex-shrink-0 ml-1"
                style={{ backgroundColor: taskList.color }}
              />
              <span className="text-muted-foreground">{taskList.name}</span>
            </div>
          )}

          {/* Priority Section */}
          {task.priority_tier && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                Priority
              </div>
              <div
                className={cn(
                  'p-3 rounded-md border',
                  task.priority_tier === 1 && 'border-red-500/30 bg-red-500/5',
                  task.priority_tier === 2 && 'border-amber-500/30 bg-amber-500/5',
                  task.priority_tier === 3 && 'border-gray-500/30 bg-gray-500/5'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={
                      task.priority_tier === 1
                        ? 'tier1'
                        : task.priority_tier === 2
                          ? 'tier2'
                          : 'tier3'
                    }
                  >
                    Tier {task.priority_tier} — {tierInfo?.label}
                  </Badge>
                </div>
                {task.priority_reasoning && (
                  <p className="text-sm text-muted-foreground">{task.priority_reasoning}</p>
                )}
              </div>
            </div>
          )}

          {/* Scores */}
          {(task.effort_score || task.impact_score || task.urgency_score || task.importance_score) && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Scores</div>
              <div className="grid grid-cols-2 gap-2">
                {task.effort_score && (
                  <ScoreItem
                    icon={Zap}
                    label="Effort"
                    value={task.effort_score}
                    description={PRIORITY_SCALES.effort[task.effort_score as keyof typeof PRIORITY_SCALES.effort]?.label}
                  />
                )}
                {task.impact_score && (
                  <ScoreItem
                    icon={Gem}
                    label="Impact"
                    value={task.impact_score}
                    description={PRIORITY_SCALES.impact[task.impact_score as keyof typeof PRIORITY_SCALES.impact]?.label}
                  />
                )}
                {task.urgency_score && (
                  <ScoreItem
                    icon={AlertCircle}
                    label="Urgency"
                    value={task.urgency_score}
                    description={PRIORITY_SCALES.urgency[task.urgency_score as keyof typeof PRIORITY_SCALES.urgency]?.label}
                  />
                )}
                {task.importance_score && (
                  <ScoreItem
                    icon={Target}
                    label="Importance"
                    value={task.importance_score}
                    description={PRIORITY_SCALES.importance[task.importance_score as keyof typeof PRIORITY_SCALES.importance]?.label}
                  />
                )}
              </div>
            </div>
          )}

          {/* Due Date */}
          <DueDatePicker task={task} onUpdate={(input) => updateMutation.mutate(input)} />

          {/* Recurrence */}
          <RecurrencePicker task={task} onUpdate={(input) => updateMutation.mutate(input)} />

          {/* Duration */}
          <DurationPicker task={task} onUpdate={(input) => updateMutation.mutate(input)} />

          {/* Energy Level */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Energy Level
            </div>
            <div className="flex gap-2">
              {([
                { value: 'low' as const, label: 'Low', icon: Battery },
                { value: 'medium' as const, label: 'Medium', icon: BatteryMedium },
                { value: 'high' as const, label: 'High', icon: BatteryFull },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateMutation.mutate({
                    energy_required: task.energy_required === value ? null : value,
                  })}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors',
                    task.energy_required === value
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'border-input hover:bg-accent'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4" />
              Goals
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {task.goals.length > 0 && (
                <>
                  {task.goals.map((goal) => (
                    <div
                      key={goal.goal_id}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 rounded-full"
                    >
                      <Target className="h-3 w-3" />
                      <span>{goal.goal_name}</span>
                    </div>
                  ))}
                </>
              )}
              <GoalPicker
                taskId={task.id}
                selectedGoals={task.goals}
                onGoalsChange={handleGoalsChange}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Hash className="h-4 w-4" />
              Tags
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {task.tags && task.tags.length > 0 && (
                <>
                  {task.tags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </>
              )}
              <TagPicker
                taskId={task.id}
                selectedTags={task.tags || []}
                onTagsChange={handleTagsChange}
              />
            </div>
          </div>

          {/* Subtasks */}
          <SubtaskList taskId={task.id} />

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              Notes
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes..."
              className="w-full min-h-[100px] p-3 text-sm bg-secondary/30 rounded-md border-0 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* AI Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Smart Suggestions
            </div>

            <div className="space-y-2">
              {/* Due Date Suggestion */}
              {!showDueDateSuggestion ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetDueDateSuggestion}
                  disabled={!!task.due_date}
                  className="w-full justify-start gap-2"
                >
                  <CalendarPlus className="h-4 w-4" />
                  {task.due_date ? 'Due date already set' : 'Suggest Due Date'}
                </Button>
              ) : (
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarPlus className="h-4 w-4" />
                    Due Date Suggestion
                  </div>
                  {loadingDueDate ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing task patterns...
                    </div>
                  ) : dueDateSuggestion ? (
                    <>
                      <div className="text-sm">
                        <span className="font-medium">Suggested: </span>
                        {format(parseISO(dueDateSuggestion.suggestedDate), 'MMMM d, yyyy')}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({Math.round(dueDateSuggestion.confidence * 100)}% confidence)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{dueDateSuggestion.reasoning}</p>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleApplyDueDateSuggestion}
                          className="flex-1 gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Apply
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowDueDateSuggestion(false);
                            setDueDateSuggestion(null);
                          }}
                          className="flex-1"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No suggestion available.</p>
                  )}
                </div>
              )}

              {/* Breakdown Suggestion */}
              {!showBreakdownSuggestion ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetBreakdownSuggestion}
                  className="w-full justify-start gap-2"
                >
                  <ListPlus className="h-4 w-4" />
                  Suggest Task Breakdown
                </Button>
              ) : (
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ListPlus className="h-4 w-4" />
                    Task Breakdown Suggestion
                  </div>
                  {loadingBreakdown ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing task complexity...
                    </div>
                  ) : breakdownSuggestion ? (
                    <>
                      <div className="space-y-1">
                        {breakdownSuggestion.subtasks.map((subtask, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {subtask.title}
                            </span>
                            {subtask.estimatedMinutes && (
                              <span className="text-xs text-muted-foreground">
                                ~{subtask.estimatedMinutes}m
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground pt-1">
                        Total: ~{breakdownSuggestion.totalEstimatedMinutes}m
                      </div>
                      <p className="text-xs text-muted-foreground">{breakdownSuggestion.reasoning}</p>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleApplyBreakdownSuggestion}
                          className="flex-1 gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Add Subtasks
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowBreakdownSuggestion(false);
                            setBreakdownSuggestion(null);
                          }}
                          className="flex-1"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No breakdown suggested for this task.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
            <p>Created: {format(parseUTCTimestamp(task.created_at), 'PPp')}</p>
            <p>Updated: {format(parseUTCTimestamp(task.updated_at), 'PPp')}</p>
            {task.prioritized_at && (
              <p>Last prioritized: {format(parseUTCTimestamp(task.prioritized_at), 'PPp')}</p>
            )}
          </div>

          {/* Delete Button */}
          <div className="pt-4 mt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Task'}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

interface ScoreItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
  description?: string;
}

function ScoreItem({ icon: Icon, label, value, description }: ScoreItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <div className="flex items-center gap-1">
          <span className="font-medium">{label}:</span>
          <span>{value}/5</span>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// RecurrencePicker
// ============================================================================

const RECURRENCE_OPTIONS = [
  { label: 'None', value: null },
  { label: 'Daily', value: { frequency: 'daily' as const, interval: 1 } },
  { label: 'Weekdays (Mon-Fri)', value: { frequency: 'weekdays' as const, interval: 1 } },
  { label: 'Weekly', value: { frequency: 'weekly' as const, interval: 1 } },
  { label: 'Every 2 Weeks', value: { frequency: 'weekly' as const, interval: 2 } },
  { label: 'Monthly', value: { frequency: 'monthly' as const, interval: 1 } },
];

interface RecurrencePickerProps {
  task: TaskWithGoals;
  onUpdate: (input: UpdateTaskInput) => void;
}

function RecurrencePicker({ task, onUpdate }: RecurrencePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [endDateInput, setEndDateInput] = useState(task.recurrence_end_date ?? '');

  const currentRule = task.recurrence_rule
    ? (() => { try { return JSON.parse(task.recurrence_rule); } catch { return null; } })()
    : null;

  const currentLabel = currentRule
    ? RECURRENCE_OPTIONS.find(
        (o) => o.value?.frequency === currentRule.frequency && o.value?.interval === currentRule.interval
      )?.label ?? `Every ${currentRule.interval} ${currentRule.frequency}`
    : 'None';

  const handleSelectRecurrence = (option: typeof RECURRENCE_OPTIONS[number]) => {
    if (option.value === null) {
      onUpdate({ recurrence_rule: null, recurrence_end_date: null });
    } else {
      onUpdate({
        recurrence_rule: JSON.stringify(option.value),
        recurrence_end_date: endDateInput || null,
      });
    }
    setIsOpen(false);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndDateInput(value);
    if (task.recurrence_rule) {
      onUpdate({ recurrence_end_date: value || null });
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 text-sm hover:bg-accent/50 rounded px-1 py-0.5 transition-colors">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <span>
              {currentRule ? (
                <>
                  Repeats {currentLabel.toLowerCase()}
                  {task.recurrence_end_date && (
                    <span className="text-muted-foreground">
                      {' '}until {format(parseISO(task.recurrence_end_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">Set recurrence...</span>
              )}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          <div className="space-y-0.5">
            {RECURRENCE_OPTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => handleSelectRecurrence(option)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors',
                  option.value?.frequency === currentRule?.frequency &&
                    option.value?.interval === currentRule?.interval &&
                    'bg-accent'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* End date input - shown when recurrence is set */}
      {currentRule && (
        <div className="flex items-center gap-2 pl-6">
          <label className="text-xs text-muted-foreground">Until:</label>
          <input
            type="date"
            value={endDateInput}
            onChange={handleEndDateChange}
            className="text-xs bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DueDatePicker
// ============================================================================

const DUE_DATE_PRESETS = [
  { label: 'Today', getValue: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Tomorrow', getValue: () => format(addDays(new Date(), 1), 'yyyy-MM-dd') },
  { label: 'Next Week', getValue: () => format(addWeeks(startOfDay(new Date()), 1), 'yyyy-MM-dd') },
  { label: 'Next Month', getValue: () => format(addMonths(startOfDay(new Date()), 1), 'yyyy-MM-dd') },
];

interface DueDatePickerProps {
  task: TaskWithGoals;
  onUpdate: (input: UpdateTaskInput) => void;
}

function DueDatePicker({ task, onUpdate }: DueDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeInput, setTimeInput] = useState(task.due_time ?? '');

  const isOverdue =
    task.due_date &&
    isPast(parseISO(task.due_date)) &&
    !isToday(parseISO(task.due_date)) &&
    !task.completed;

  const displayLabel = (() => {
    if (!task.due_date) return null;
    const date = parseISO(task.due_date);
    if (isToday(date)) return 'Today';
    const tomorrow = addDays(startOfDay(new Date()), 1);
    if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) return 'Tomorrow';
    return format(date, 'MMMM d, yyyy');
  })();

  const handleSelectPreset = (dateStr: string) => {
    onUpdate({ due_date: dateStr });
  };

  const handleSelectCalendarDate = (date: Date | undefined) => {
    if (date) {
      onUpdate({ due_date: format(date, 'yyyy-MM-dd') });
    }
  };

  const handleClear = () => {
    onUpdate({ due_date: null, due_time: null });
    setTimeInput('');
    setIsOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeInput(value);
    onUpdate({ due_time: value || null });
  };

  useEffect(() => {
    setTimeInput(task.due_time ?? '');
  }, [task.due_time]);

  const selectedDate = task.due_date ? parseISO(task.due_date) : undefined;

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-2 text-sm hover:bg-accent/50 rounded px-1 py-0.5 transition-colors',
              isOverdue && 'text-red-400'
            )}
          >
            <CalendarIcon
              className={cn('h-4 w-4', isOverdue ? 'text-red-400' : 'text-muted-foreground')}
            />
            <span>
              {displayLabel ? (
                <>
                  Due {displayLabel}
                  {task.due_time && (
                    <span className="text-muted-foreground"> at {task.due_time}</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">Set due date...</span>
              )}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Left side: Presets + time */}
            <div className="border-r border-border p-2 space-y-0.5">
              {DUE_DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSelectPreset(preset.getValue())}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors whitespace-nowrap',
                    task.due_date === preset.getValue() && 'bg-accent'
                  )}
                >
                  {preset.label}
                </button>
              ))}

              <div className="border-t border-border my-1" />

              <button
                onClick={handleClear}
                className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors text-muted-foreground"
              >
                No due date
              </button>

              {task.due_date && (
                <>
                  <div className="border-t border-border my-1" />
                  <div className="px-3 py-1.5 space-y-1">
                    <label className="text-xs text-muted-foreground">Time</label>
                    <input
                      type="time"
                      value={timeInput}
                      onChange={handleTimeChange}
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
                selected={selectedDate}
                onSelect={handleSelectCalendarDate}
                initialFocus
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ============================================================================
// DurationPicker
// ============================================================================

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

interface DurationPickerProps {
  task: TaskWithGoals;
  onUpdate: (input: UpdateTaskInput) => void;
}

function DurationPicker({ task, onUpdate }: DurationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${minutes}m`;
  };

  const handleSelectPreset = (value: number) => {
    onUpdate({ estimated_minutes: value });
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const parsed = parseInt(customValue, 10);
    if (parsed > 0) {
      onUpdate({ estimated_minutes: parsed });
      setCustomValue('');
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onUpdate({ estimated_minutes: null });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 text-sm hover:bg-accent/50 rounded px-1 py-0.5 transition-colors">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {task.estimated_minutes ? (
              formatDuration(task.estimated_minutes)
            ) : (
              <span className="text-muted-foreground">Set duration...</span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="grid grid-cols-2 gap-1">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleSelectPreset(preset.value)}
              className={cn(
                'px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors text-left',
                task.estimated_minutes === preset.value && 'bg-accent'
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
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
              className="h-7 text-sm"
              min={1}
              max={480}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={!customValue || parseInt(customValue, 10) < 1}
              onClick={handleCustomSubmit}
            >
              Set
            </Button>
          </div>
        </div>

        {task.estimated_minutes && (
          <button
            onClick={handleClear}
            className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors text-muted-foreground mt-1"
          >
            No duration
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
