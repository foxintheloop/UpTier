import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

interface QuickAddProps {
  listId: string;
  onTaskCreated: () => void;
}

export function QuickAdd({ listId, onTaskCreated }: QuickAddProps) {
  const [title, setTitle] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const createTaskMutation = useMutation({
    mutationFn: (title: string) =>
      window.electronAPI.tasks.create({
        list_id: listId,
        title,
      }),
    onSuccess: () => {
      setTitle('');
      onTaskCreated();
    },
  });

  const handleSubmit = () => {
    if (title.trim()) {
      createTaskMutation.mutate(title.trim());
    }
  };

  return (
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
        placeholder="Add a task"
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
  );
}
