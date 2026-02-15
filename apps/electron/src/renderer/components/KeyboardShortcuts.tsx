import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_CATEGORIES = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['↑', '↓'], description: 'Navigate tasks' },
      { keys: ['Esc'], description: 'Close panel / clear selection' },
    ],
  },
  {
    name: 'Tasks',
    shortcuts: [
      { keys: ['Ctrl', 'N'], description: 'New task (focus quick add)' },
      { keys: ['Space'], description: 'Toggle task completion' },
      { keys: ['Del'], description: 'Delete selected task' },
    ],
  },
  {
    name: 'Search',
    shortcuts: [
      { keys: ['Ctrl', 'F'], description: 'Focus search' },
    ],
  },
  {
    name: 'Focus Timer',
    shortcuts: [
      { keys: ['Space'], description: 'Pause / resume timer' },
      { keys: ['Esc'], description: 'End focus session' },
    ],
  },
  {
    name: 'Help',
    shortcuts: [
      { keys: ['?'], description: 'Show this dialog' },
    ],
  },
];

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <span key={i}>
          {i > 0 && <span className="text-muted-foreground mx-0.5">+</span>}
          <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono bg-secondary border border-border rounded">
            {key}
          </kbd>
        </span>
      ))}
    </div>
  );
}

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.name}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {category.name}
              </h3>
              <div className="space-y-1.5">
                {category.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <KeyCombo keys={shortcut.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
