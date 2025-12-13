import type { TaskWithGoals } from '@uptier/shared';
interface TaskItemProps {
    task: TaskWithGoals;
    isSelected: boolean;
    onSelect: () => void;
    onComplete: (completed: boolean) => void;
    isDraggable?: boolean;
}
export declare function TaskItem({ task, isSelected, onSelect, onComplete, isDraggable }: TaskItemProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=TaskItem.d.ts.map