import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type ThemeMode = 'dark' | 'light' | 'system';

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThemeChange: (theme: ThemeMode) => void;
}

const THEMES = [
  { id: 'light' as const, label: 'Light', icon: Sun },
  { id: 'dark' as const, label: 'Dark', icon: Moon },
  { id: 'system' as const, label: 'System', icon: Monitor },
];

export function Settings({ open, onOpenChange, onThemeChange }: SettingsProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    // Load current theme on mount
    window.electronAPI.settings.get().then((settings) => {
      setCurrentTheme(settings.theme);
    });
  }, [open]);

  const handleThemeChange = async (theme: ThemeMode) => {
    setCurrentTheme(theme);
    await window.electronAPI.settings.set({ theme });
    onThemeChange(theme);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Appearance</h4>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleThemeChange(id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors',
                    currentTheme === id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">About</h4>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm font-medium">1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Built with</span>
                <span className="text-sm">Electron + React</span>
              </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Links</h4>
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-between h-9"
                onClick={() => window.open('https://github.com', '_blank')}
              >
                <span className="text-sm">GitHub Repository</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-between h-9"
                onClick={() => window.open('https://anthropic.com', '_blank')}
              >
                <span className="text-sm">Powered by Claude</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
