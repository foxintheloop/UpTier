import { useState, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarIcon, Clock, Tag, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { parseTaskInput, type ParsedTask } from '@/lib/nlp-parser';

interface QuickAddProps {
  listId: string;
  onTaskCreated: () => void;
}

export interface QuickAddHandle {
  focus: () => void;
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

export const QuickAdd = forwardRef<QuickAddHandle, QuickAddProps>(function QuickAdd(
  { listId, onTaskCreated },
  ref
) {
  const [title, setTitle] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const parsed = useMemo<ParsedTask | null>(() => {
    if (!title.trim()) return null;
    return parseTaskInput(title);
  }, [title]);

  const hasTokens = parsed && parsed.tokens.length > 0;

  const createTaskMutation = useMutation({
    mutationFn: async (p: ParsedTask) => {
      const task = await window.electronAPI.tasks.create({
        list_id: listId,
        title: p.cleanTitle || title.trim(),
        due_date: p.dueDate,
        due_time: p.dueTime,
        priority_tier: p.priorityTier,
        estimated_minutes: p.estimatedMinutes,
      });

      // Create and link tags
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
      onTaskCreated();
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) return;
    const p = parseTaskInput(title);
    createTaskMutation.mutate(p);
  };

  return (
    <div className="space-y-0">
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background transition-colors',
          isFocused ? 'border-primary' : 'border-input'
        )}
      >
        <div className="pl-3">
          <Plus className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          ref={inputRef}
          placeholder="Add a task (try: Buy groceries tomorrow #errands !1 ~30m)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={createTaskMutation.isPending}
        />
      </div>

      {/* Parsed token preview */}
      {hasTokens && isFocused && (
        <div className="flex items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground flex-wrap">
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
  );
});
