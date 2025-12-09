import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from './ui/scroll-area';
import { TaskItem } from './TaskItem';
import { QuickAdd } from './QuickAdd';
import { TierHeader } from './TierHeader';
import type { TaskWithGoals, PriorityTier } from '@uptier/shared';

interface TaskListProps {
  listId: string;
  selectedTaskId?: string;
  onSelectTask: (task: TaskWithGoals | null) => void;
}

export function TaskList({ listId, selectedTaskId, onSelectTask }: TaskListProps) {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<TaskWithGoals[]>({
    queryKey: ['tasks', listId],
    queryFn: () => window.electronAPI.tasks.getByList({ list_id: listId }),
    enabled: !!listId,
  });

  // Group tasks by priority tier
  const groupedTasks = useMemo(() => {
    const tier1: TaskWithGoals[] = [];
    const tier2: TaskWithGoals[] = [];
    const tier3: TaskWithGoals[] = [];
    const unprioritized: TaskWithGoals[] = [];

    for (const task of tasks) {
      if (task.priority_tier === 1) {
        tier1.push(task);
      } else if (task.priority_tier === 2) {
        tier2.push(task);
      } else if (task.priority_tier === 3) {
        tier3.push(task);
      } else {
        unprioritized.push(task);
      }
    }

    return { tier1, tier2, tier3, unprioritized };
  }, [tasks]);

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    if (completed) {
      await window.electronAPI.tasks.complete(taskId);
    } else {
      await window.electronAPI.tasks.uncomplete(taskId);
    }
    queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    queryClient.invalidateQueries({ queryKey: ['lists'] });
  };

  const handleTaskCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    queryClient.invalidateQueries({ queryKey: ['lists'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading tasks...
      </div>
    );
  }

  const renderTaskGroup = (groupTasks: TaskWithGoals[], tier?: PriorityTier) => {
    if (groupTasks.length === 0) return null;

    return (
      <div className="mb-4">
        {tier && <TierHeader tier={tier} count={groupTasks.length} />}
        <div className="space-y-1">
          {groupTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isSelected={task.id === selectedTaskId}
              onSelect={() => onSelectTask(task)}
              onComplete={(completed) => handleTaskComplete(task.id, completed)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Quick Add */}
      <div className="p-4 border-b border-border">
        <QuickAdd listId={listId} onTaskCreated={handleTaskCreated} />
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No tasks yet</p>
              <p className="text-sm">Add a task above to get started</p>
            </div>
          ) : (
            <>
              {renderTaskGroup(groupedTasks.tier1, 1)}
              {renderTaskGroup(groupedTasks.tier2, 2)}
              {renderTaskGroup(groupedTasks.tier3, 3)}
              {groupedTasks.unprioritized.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                    UNPRIORITIZED
                  </div>
                  <div className="space-y-1">
                    {groupedTasks.unprioritized.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        isSelected={task.id === selectedTaskId}
                        onSelect={() => onSelectTask(task)}
                        onComplete={(completed) => handleTaskComplete(task.id, completed)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
