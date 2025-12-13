import type { TaskWithGoals } from '@uptier/shared';
interface TaskDetailProps {
    task: TaskWithGoals;
    onClose: () => void;
    onUpdate: (task: TaskWithGoals) => void;
}
export declare function TaskDetail({ task, onClose, onUpdate }: TaskDetailProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=TaskDetail.d.ts.map