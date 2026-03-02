import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { X, Plus, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Subtask } from '@uptier/shared';

interface SubtaskListProps {
  taskId: string;
}

function SubtaskItem({
  subtask,
  onComplete,
  onDelete,
}: {
  subtask: Subtask;
  onComplete: (completed: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
    >
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={(checked) => onComplete(checked === true)}
        className="h-3.5 w-3.5"
      />
      <span
        className={cn(
          'flex-1 text-sm',
          subtask.completed && 'line-through text-muted-foreground'
        )}
      >
        {subtask.title}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function SubtaskList({ taskId }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: subtasks = [] } = useQuery<Subtask[]>({
    queryKey: ['subtasks', taskId],
    queryFn: () => window.electronAPI.subtasks.getByTask(taskId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });

  const addMutation = useMutation({
    mutationFn: (title: string) => window.electronAPI.subtasks.add(taskId, title),
    onSuccess: invalidate,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI.subtasks.complete(id),
    onSuccess: invalidate,
  });

  const uncompleteMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI.subtasks.uncomplete(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => window.electronAPI.subtasks.delete(id),
    onSuccess: invalidate,
  });

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (trimmed) {
      addMutation.mutate(trimmed);
      setNewTitle('');
    }
  };

  const handleComplete = (subtask: Subtask, completed: boolean) => {
    if (completed) {
      completeMutation.mutate(subtask.id);
    } else {
      uncompleteMutation.mutate(subtask.id);
    }
  };

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ListChecks className="h-4 w-4" />
        Subtasks
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground font-normal">
            {completedCount}/{totalCount}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <div className="space-y-0.5">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onComplete={(completed) => handleComplete(subtask, completed)}
              onDelete={() => deleteMutation.mutate(subtask.id)}
            />
          ))}
        </div>
      )}

      {/* Quick add */}
      <div className="flex items-center gap-2">
        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Add subtask"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="h-7 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          disabled={addMutation.isPending}
        />
      </div>
    </div>
  );
}
