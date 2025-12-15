import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Target } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { cn } from '@/lib/utils';
import type { Goal, GoalWithProgress, Timeframe } from '@uptier/shared';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

interface GoalPickerProps {
  taskId: string;
  selectedGoals: Array<{ goal_id: string; goal_name: string; alignment_strength: number }>;
  onGoalsChange: () => void;
}

export function GoalPicker({ taskId, selectedGoals, onGoalsChange }: GoalPickerProps) {
  const [open, setOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('weekly');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const queryClient = useQueryClient();

  const { data: allGoals = [] } = useQuery<GoalWithProgress[]>({
    queryKey: ['goals'],
    queryFn: () => window.electronAPI.goals.getAllWithProgress(),
  });

  const selectedGoalIds = useMemo(
    () => new Set(selectedGoals.map((g) => g.goal_id)),
    [selectedGoals]
  );

  const createGoalMutation = useMutation({
    mutationFn: (input: { name: string; timeframe: Timeframe }) =>
      window.electronAPI.goals.create(input),
    onSuccess: async (newGoal: Goal) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      // Automatically add the new goal to the task
      await window.electronAPI.tasks.addGoal(taskId, newGoal.id);
      onGoalsChange();
      setNewGoalName('');
      setShowCreateForm(false);
    },
  });

  const addGoalMutation = useMutation({
    mutationFn: (goalId: string) => window.electronAPI.tasks.addGoal(taskId, goalId),
    onSuccess: () => {
      onGoalsChange();
    },
  });

  const removeGoalMutation = useMutation({
    mutationFn: (goalId: string) => window.electronAPI.tasks.removeGoal(taskId, goalId),
    onSuccess: () => {
      onGoalsChange();
    },
  });

  const handleToggleGoal = (goal: Goal) => {
    if (selectedGoalIds.has(goal.id)) {
      removeGoalMutation.mutate(goal.id);
    } else {
      addGoalMutation.mutate(goal.id);
    }
  };

  const handleCreateGoal = () => {
    if (newGoalName.trim()) {
      createGoalMutation.mutate({ name: newGoalName.trim(), timeframe: selectedTimeframe });
    }
  };

  const getTimeframeColor = (timeframe: Timeframe) => {
    switch (timeframe) {
      case 'daily':
        return 'text-emerald-400';
      case 'weekly':
        return 'text-blue-400';
      case 'monthly':
        return 'text-purple-400';
      case 'quarterly':
        return 'text-amber-400';
      case 'yearly':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1">
          <Target className="h-3 w-3" />
          <span>Goals</span>
          {selectedGoals.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 rounded-full">
              {selectedGoals.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        {/* Selected goals */}
        {selectedGoals.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-border">
            {selectedGoals.map((goal) => (
              <div
                key={goal.goal_id}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 rounded-full"
              >
                <Target className="h-3 w-3" />
                <span>{goal.goal_name}</span>
                <button
                  onClick={() => removeGoalMutation.mutate(goal.goal_id)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Available goals */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {allGoals.length === 0 && !showCreateForm ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No goals yet. Create one!
            </p>
          ) : (
            allGoals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleToggleGoal(goal)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors',
                  selectedGoalIds.has(goal.id) && 'bg-accent'
                )}
              >
                <Target className={cn('h-4 w-4', getTimeframeColor(goal.timeframe))} />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span>{goal.name}</span>
                    <span className={cn('text-xs', getTimeframeColor(goal.timeframe))}>
                      {goal.timeframe}
                    </span>
                  </div>
                  {goal.total_tasks > 0 && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${goal.progress_percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {goal.completed_tasks}/{goal.total_tasks}
                      </span>
                    </div>
                  )}
                </div>
                {selectedGoalIds.has(goal.id) && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Create new goal */}
        {showCreateForm ? (
          <div className="mt-2 pt-2 border-t border-border space-y-2">
            <Input
              autoFocus
              placeholder="Goal name"
              value={newGoalName}
              onChange={(e) => setNewGoalName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGoal();
                if (e.key === 'Escape') {
                  setShowCreateForm(false);
                  setNewGoalName('');
                }
              }}
              className="h-8"
            />
            <div className="flex flex-wrap gap-1">
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTimeframe(option.value)}
                  className={cn(
                    'px-2 py-1 text-xs rounded transition-colors',
                    selectedTimeframe === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewGoalName('');
                }}
                className="flex-1 h-7"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateGoal}
                disabled={!newGoalName.trim() || createGoalMutation.isPending}
                className="flex-1 h-7"
              >
                Create
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 mt-2 pt-2 border-t border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create new goal</span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
