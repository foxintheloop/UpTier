import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from './ui/checkbox';
import { PriorityBadge } from './PriorityBadge';
import { TagBadge } from './TagBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Clock, Target, Zap, Gem, GripVertical, Play, Repeat, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskWithGoals } from '@uptier/shared';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

interface TaskItemProps {
  task: TaskWithGoals;
  isSelected: boolean;
  onSelect: () => void;
  onComplete: (completed: boolean) => void;
  onStartFocus?: (task: TaskWithGoals) => void;
  isDraggable?: boolean;
  riskLevel?: 'warning' | 'critical';
  riskReason?: string;
}

export function TaskItem({ task, isSelected, onSelect, onComplete, onStartFocus, isDraggable = true, riskLevel, riskReason }: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const formatDueDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const isDueOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'task-item group flex items-start gap-2 px-3 py-2 rounded-md cursor-pointer',
          isSelected && 'bg-accent',
          task.completed && 'opacity-60',
          isDragging && 'opacity-50 bg-accent shadow-lg'
        )}
        onClick={onSelect}
        {...attributes}
      >
        {/* Drag Handle */}
        {isDraggable && (
          <div
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Checkbox */}
        <Checkbox
          checked={task.completed}
          onCheckedChange={(checked) => {
            onComplete(checked === true);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />

        {/* Focus Button */}
        {!task.completed && onStartFocus && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartFocus(task);
                }}
                className="mt-0.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20 text-muted-foreground hover:text-primary"
              >
                <Play className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Start Focus Session</TooltipContent>
          </Tooltip>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className={cn('text-sm', task.completed && 'line-through text-muted-foreground')}>
            {task.title}
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Priority Badge */}
            {task.priority_tier && (
              <PriorityBadge tier={task.priority_tier} reasoning={task.priority_reasoning} />
            )}

            {/* Goal link */}
            {task.goals.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Target className="h-3 w-3" />
                    <span>{task.goals[0].goal_name}</span>
                    {task.goals.length > 1 && <span>+{task.goals.length - 1}</span>}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-medium mb-1">Linked Goals:</p>
                    {task.goals.map((g) => (
                      <p key={g.goal_id}>{g.goal_name}</p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Effort/Impact indicators */}
            {task.effort_score && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    <span>{task.effort_score}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Effort: {task.effort_score}/5</TooltipContent>
              </Tooltip>
            )}

            {task.impact_score && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Gem className="h-3 w-3" />
                    <span>{task.impact_score}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Impact: {task.impact_score}/5</TooltipContent>
              </Tooltip>
            )}

            {/* Estimated time */}
            {task.estimated_minutes && (
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {task.estimated_minutes >= 60
                    ? `${Math.floor(task.estimated_minutes / 60)}h${task.estimated_minutes % 60 > 0 ? ` ${task.estimated_minutes % 60}m` : ''}`
                    : `${task.estimated_minutes}m`}
                </span>
              </div>
            )}

            {/* Due date */}
            {task.due_date && (
              <div
                className={cn(
                  'text-xs flex items-center gap-1',
                  isDueOverdue ? 'text-red-400' : 'text-muted-foreground'
                )}
              >
                {riskLevel && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle
                        className={cn(
                          'h-3 w-3',
                          riskLevel === 'critical' ? 'text-red-400' : 'text-amber-400'
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{riskReason}</TooltipContent>
                  </Tooltip>
                )}
                {formatDueDate(task.due_date)}
                {task.recurrence_rule && <Repeat className="h-3 w-3" />}
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {task.tags.slice(0, 2).map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
                {task.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{task.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
