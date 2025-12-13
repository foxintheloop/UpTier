import type { TaskWithGoals } from '@uptier/shared';
interface TaskListProps {
    listId: string;
    selectedTaskId?: string;
    onSelectTask: (task: TaskWithGoals | null) => void;
}
export interface TaskListHandle {
    focusQuickAdd: () => void;
    focusSearch: () => void;
    getAllTasks: () => TaskWithGoals[];
    selectTaskByIndex: (index: number) => void;
}
export declare const TaskList: import("react").ForwardRefExoticComponent<TaskListProps & import("react").RefAttributes<TaskListHandle>>;
export {};
//# sourceMappingURL=TaskList.d.ts.map