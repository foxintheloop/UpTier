import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Target, Calendar, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import type { GoalWithProgress, TaskWithGoals, UpdateGoalInput, Timeframe, GoalStatus } from '@uptier/shared';
import { format, parseISO } from 'date-fns';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string; color: string }[] = [
  { value: 'daily', label: 'Daily', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'weekly', label: 'Weekly', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'monthly', label: 'Monthly', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { value: 'quarterly', label: 'Quarterly', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'yearly', label: 'Yearly', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
];

const STATUS_OPTIONS: { value: GoalStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'text-blue-400 bg-blue-500/10' },
  { value: 'completed', label: 'Completed', color: 'text-green-400 bg-green-500/10' },
  { value: 'abandoned', label: 'Abandoned', color: 'text-gray-400 bg-gray-500/10' },
];

interface GoalDetailProps {
  goal: GoalWithProgress;
  onClose: () => void;
  onUpdate: (goal: GoalWithProgress) => void;
  onSelectTask?: (task: TaskWithGoals) => void;
}

export function GoalDetail({ goal, onClose, onUpdate, onSelectTask }: GoalDetailProps) {
  const [name, setName] = useState(goal.name);
  const [description, setDescription] = useState(goal.description || '');
  const queryClient = useQueryClient();

  useEffect(() => {
    setName(goal.name);
    setDescription(goal.description || '');
  }, [goal.id, goal.name, goal.description]);

  const { data: linkedTasks = [] } = useQuery<TaskWithGoals[]>({
    queryKey: ['goals', goal.id, 'tasks'],
    queryFn: () => window.electronAPI.goals.getTasks(goal.id),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateGoalInput) => window.electronAPI.goals.update(goal.id, input),
    onSuccess: (updated) => {
      if (updated) {
        queryClient.invalidateQueries({ queryKey: ['goals'] });
        onUpdate({ ...goal, ...updated });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => window.electronAPI.goals.delete(goal.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onClose();
    },
  });

  const handleNameBlur = () => {
    if (name !== goal.name && name.trim()) {
      updateMutation.mutate({ name: name.trim() });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (goal.description || '')) {
      updateMutation.mutate({ description: description || null });
    }
  };

  const handleTimeframeChange = (timeframe: Timeframe) => {
    updateMutation.mutate({ timeframe });
  };

  const handleStatusChange = (status: GoalStatus) => {
    updateMutation.mutate({ status });
  };

  const handleDelete = () => {
    if (window.confirm(`Delete goal "${goal.name}"? Tasks linked to this goal will be unlinked.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Goal Details</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Name */}
          <div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              className="text-lg font-medium border-0 px-0 focus-visible:ring-0"
              placeholder="Goal name"
            />
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{goal.progress_percentage}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  goal.progress_percentage === 100 ? 'bg-green-500' : 'bg-primary'
                )}
                style={{ width: `${goal.progress_percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {goal.completed_tasks} of {goal.total_tasks} tasks completed
            </p>
          </div>

          {/* Timeframe */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Timeframe
            </div>
            <div className="flex flex-wrap gap-1">
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimeframeChange(option.value)}
                  className={cn(
                    'px-2 py-1 text-xs rounded border transition-colors',
                    goal.timeframe === option.value
                      ? option.color
                      : 'border-border hover:bg-accent'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Status</div>
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded transition-colors',
                    goal.status === option.value
                      ? option.color
                      : 'bg-secondary hover:bg-secondary/80'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Date */}
          {goal.target_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Target: {format(parseISO(goal.target_date), 'MMMM d, yyyy')}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add a description..."
              className="w-full min-h-[80px] p-3 text-sm bg-secondary/30 rounded-md border-0 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Linked Tasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Linked Tasks</div>
              <span className="text-xs text-muted-foreground">{linkedTasks.length} tasks</span>
            </div>
            {linkedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tasks linked to this goal yet.
              </p>
            ) : (
              <div className="space-y-1">
                {linkedTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onSelectTask?.(task)}
                    className="w-full flex items-center gap-2 p-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        'flex-1 truncate',
                        task.completed && 'line-through text-muted-foreground'
                      )}
                    >
                      {task.title}
                    </span>
                    {task.priority_tier && (
                      <Badge
                        variant={
                          task.priority_tier === 1
                            ? 'tier1'
                            : task.priority_tier === 2
                              ? 'tier2'
                              : 'tier3'
                        }
                        className="text-xs"
                      >
                        T{task.priority_tier}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
            <p>Created: {format(parseISO(goal.created_at), 'PPp')}</p>
            <p>Updated: {format(parseISO(goal.updated_at), 'PPp')}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
