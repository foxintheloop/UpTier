import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { GripVertical, X, Plus, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Subtask } from '@uptier/shared';

interface SubtaskListProps {
  taskId: string;
}

function SortableSubtaskItem({
  subtask,
  onComplete,
  onDelete,
}: {
  subtask: Subtask;
  onComplete: (completed: boolean) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors',
        isDragging && 'opacity-50 bg-accent shadow-md'
      )}
      {...attributes}
    >
      <div
        {...listeners}
        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder locally — the subtask API doesn't have a reorder endpoint,
    // so we just refetch after any mutation. For now, order is by position field.
    // TODO: Add subtasks:reorder IPC handler for persistent drag reorder
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={subtasks.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {subtasks.map((subtask) => (
                <SortableSubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onComplete={(completed) => handleComplete(subtask, completed)}
                  onDelete={() => deleteMutation.mutate(subtask.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
