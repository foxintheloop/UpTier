import { toast } from 'sonner';

interface UndoableDeleteOptions {
  label: string;
  onDelete: () => void;
  onUndo: () => void;
  duration?: number;
}

export function undoableDelete({ label, onDelete, onUndo, duration = 5000 }: UndoableDeleteOptions) {
  const timeout = setTimeout(onDelete, duration);
  toast(`Deleted "${label}"`, {
    duration,
    action: {
      label: 'Undo',
      onClick: () => {
        clearTimeout(timeout);
        onUndo();
      },
    },
  });
}
