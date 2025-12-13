import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
export const QuickAdd = forwardRef(function QuickAdd({ listId, onTaskCreated }, ref) {
    const [title, setTitle] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
    }));
    const createTaskMutation = useMutation({
        mutationFn: (title) => window.electronAPI.tasks.create({
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
    return (<div className={cn('flex items-center gap-2 rounded-md border bg-background transition-colors', isFocused ? 'border-primary' : 'border-input')}>
      <div className="pl-3">
        <Plus className="h-4 w-4 text-muted-foreground"/>
      </div>
      <Input ref={inputRef} placeholder="Add a task" value={title} onChange={(e) => setTitle(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        }} className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0" disabled={createTaskMutation.isPending}/>
    </div>);
});
//# sourceMappingURL=QuickAdd.js.map