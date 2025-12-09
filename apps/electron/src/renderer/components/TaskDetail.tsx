import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Clock, Target, Zap, Gem, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import type { TaskWithGoals, UpdateTaskInput } from '@uptier/shared';
import { PRIORITY_SCALES, PRIORITY_TIERS } from '@uptier/shared';
import { format, parseISO } from 'date-fns';

interface TaskDetailProps {
  task: TaskWithGoals;
  onClose: () => void;
  onUpdate: (task: TaskWithGoals) => void;
}

export function TaskDetail({ task, onClose, onUpdate }: TaskDetailProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const queryClient = useQueryClient();

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || '');
  }, [task.id, task.title, task.notes]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateTaskInput) => window.electronAPI.tasks.update(task.id, input),
    onSuccess: (updated) => {
      if (updated) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        onUpdate({ ...task, ...updated });
      }
    },
  });

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

  const tierInfo = task.priority_tier ? PRIORITY_TIERS[task.priority_tier] : null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium">Task Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
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
          {task.due_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Due {format(parseISO(task.due_date), 'MMMM d, yyyy')}</span>
              {task.due_time && <span>at {task.due_time}</span>}
            </div>
          )}

          {/* Estimated Time */}
          {task.estimated_minutes && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                Estimated:{' '}
                {task.estimated_minutes >= 60
                  ? `${Math.floor(task.estimated_minutes / 60)}h ${task.estimated_minutes % 60}m`
                  : `${task.estimated_minutes}m`}
              </span>
            </div>
          )}

          {/* Goals */}
          {task.goals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                Linked Goals
              </div>
              <div className="space-y-1">
                {task.goals.map((goal) => (
                  <div
                    key={goal.goal_id}
                    className="flex items-center justify-between text-sm p-2 rounded-md bg-secondary/30"
                  >
                    <span>{goal.goal_name}</span>
                    <span className="text-xs text-muted-foreground">
                      Strength: {goal.alignment_strength}/5
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
            <p>Created: {format(parseISO(task.created_at), 'PPp')}</p>
            <p>Updated: {format(parseISO(task.updated_at), 'PPp')}</p>
            {task.prioritized_at && (
              <p>Last prioritized: {format(parseISO(task.prioritized_at), 'PPp')}</p>
            )}
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
