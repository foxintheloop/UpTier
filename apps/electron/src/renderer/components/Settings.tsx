import { useState, useEffect } from 'react';
import { Monitor, ExternalLink, Bell, BellOff, Volume2, VolumeX, Download, Upload, FileJson, FileSpreadsheet, Check, AlertCircle, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type ThemeMode = 'dark' | 'light' | 'earth-dark' | 'earth-light' | 'cyberpunk' | 'system';

interface NotificationSettings {
  enabled: boolean;
  defaultReminderMinutes: number;
  snoozeDurationMinutes: number;
  soundEnabled: boolean;
}

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThemeChange: (theme: ThemeMode) => void;
}

interface ThemePreset {
  id: ThemeMode;
  label: string;
  preview: {
    bg: string;
    fg: string;
    primary: string;
    border: string;
  };
}

const THEMES: ThemePreset[] = [
  {
    id: 'dark',
    label: 'Dark',
    preview: {
      bg: 'hsl(222.2, 84%, 4.9%)',
      fg: 'hsl(210, 40%, 98%)',
      primary: 'hsl(217.2, 91.2%, 59.8%)',
      border: 'hsl(217.2, 32.6%, 17.5%)',
    },
  },
  {
    id: 'light',
    label: 'Light',
    preview: {
      bg: 'hsl(0, 0%, 100%)',
      fg: 'hsl(222.2, 84%, 4.9%)',
      primary: 'hsl(217.2, 91.2%, 59.8%)',
      border: 'hsl(214.3, 31.8%, 91.4%)',
    },
  },
  {
    id: 'earth-dark',
    label: 'Earth Dark',
    preview: {
      bg: 'hsl(30, 15%, 7%)',
      fg: 'hsl(40, 25%, 90%)',
      primary: 'hsl(150, 25%, 40%)',
      border: 'hsl(30, 10%, 18%)',
    },
  },
  {
    id: 'earth-light',
    label: 'Earth Light',
    preview: {
      bg: 'hsl(40, 35%, 95%)',
      fg: 'hsl(25, 40%, 15%)',
      primary: 'hsl(150, 35%, 32%)',
      border: 'hsl(35, 20%, 82%)',
    },
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    preview: {
      bg: 'hsl(260, 50%, 5%)',
      fg: 'hsl(185, 70%, 88%)',
      primary: 'hsl(185, 100%, 50%)',
      border: 'hsl(270, 35%, 16%)',
    },
  },
  {
    id: 'system',
    label: 'System',
    preview: {
      bg: 'linear-gradient(135deg, hsl(222.2, 84%, 4.9%) 50%, hsl(0, 0%, 100%) 50%)',
      fg: 'hsl(210, 40%, 98%)',
      primary: 'hsl(217.2, 91.2%, 59.8%)',
      border: 'hsl(217.2, 32.6%, 17.5%)',
    },
  },
];

const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 1440, label: '1 day' },
];

const SNOOZE_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
];

type ExportFormat = 'json' | 'csv';
type ImportMode = 'merge' | 'replace';

interface ImportPreviewData {
  format: 'uptier' | 'todoist' | 'unknown';
  valid: boolean;
  error?: string;
  counts: { lists: number; tasks: number; goals: number; subtasks: number; tags: number };
  filePath: string;
}

export function Settings({ open, onOpenChange, onThemeChange }: SettingsProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('dark');
  const [notifications, setNotifications] = useState<NotificationSettings>({
    enabled: true,
    defaultReminderMinutes: 15,
    snoozeDurationMinutes: 10,
    soundEnabled: true,
  });
  const [dailyFocusGoalMinutes, setDailyFocusGoalMinutes] = useState(120);

  // Export/Import state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load current settings on mount
    window.electronAPI.settings.get().then((settings) => {
      setCurrentTheme(settings.theme);
      if (settings.notifications) {
        setNotifications(settings.notifications);
      }
      if (settings.analytics) {
        setDailyFocusGoalMinutes(settings.analytics.dailyFocusGoalMinutes);
      }
    });
  }, [open]);

  const handleThemeChange = async (theme: ThemeMode) => {
    setCurrentTheme(theme);
    await window.electronAPI.settings.set({ theme });
    onThemeChange(theme);
  };

  const handleNotificationChange = async (updates: Partial<NotificationSettings>) => {
    const newSettings = { ...notifications, ...updates };
    setNotifications(newSettings);
    await window.electronAPI.settings.set({ notifications: newSettings });
  };

  const handleFocusGoalChange = async (minutes: number) => {
    setDailyFocusGoalMinutes(minutes);
    await window.electronAPI.settings.set({ analytics: { dailyFocusGoalMinutes: minutes } });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const result = await window.electronAPI.exportImport.exportToFile(exportFormat);
      if (result.success && result.filePath) {
        setExportSuccess(`Exported to ${result.filePath}`);
        setTimeout(() => setExportSuccess(null), 5000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectImportFile = async () => {
    setImportResult(null);
    const filePath = await window.electronAPI.exportImport.selectImportFile();
    if (filePath) {
      const preview = await window.electronAPI.exportImport.previewImport(filePath);
      setImportPreview({ ...preview, filePath });
    }
  };

  const handleExecuteImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    try {
      const result = await window.electronAPI.exportImport.executeImport(
        importPreview.filePath,
        { mode: importMode }
      );
      if (result.success) {
        const { lists, tasks, goals, subtasks, tags } = result.imported;
        setImportResult({
          success: true,
          message: `Imported: ${lists} lists, ${tasks} tasks, ${goals} goals, ${subtasks} subtasks, ${tags} tags`,
        });
        setImportPreview(null);
      } else {
        setImportResult({
          success: false,
          message: result.error || 'Import failed',
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const cancelImport = () => {
    setImportPreview(null);
    setImportResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Appearance</h4>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all',
                    currentTheme === theme.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border hover:bg-accent hover:border-accent-foreground/20'
                  )}
                >
                  {/* Theme preview swatch */}
                  <div
                    className="w-full aspect-[4/3] rounded-md overflow-hidden border relative"
                    style={{
                      background: theme.preview.bg,
                      borderColor: theme.preview.border,
                    }}
                  >
                    <div className="flex flex-col justify-end h-full p-1.5">
                      {/* Mini UI mockup */}
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: theme.preview.primary }}
                        />
                        <div
                          className="h-1 rounded-full flex-1"
                          style={{ backgroundColor: theme.preview.fg, opacity: 0.3 }}
                        />
                      </div>
                      <div
                        className="h-1 rounded-full w-3/4 mt-1"
                        style={{ backgroundColor: theme.preview.fg, opacity: 0.15 }}
                      />
                    </div>
                    {/* System theme: show monitor icon overlay */}
                    {theme.id === 'system' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Monitor className="h-5 w-5" style={{ color: theme.preview.fg }} />
                      </div>
                    )}
                  </div>
                  {/* Theme label */}
                  <span className="text-[11px] font-medium leading-tight">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Notifications</h4>
            <div className="rounded-lg border border-border p-4 space-y-4">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {notifications.enabled ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">Enable reminders</span>
                </div>
                <button
                  onClick={() => handleNotificationChange({ enabled: !notifications.enabled })}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    notifications.enabled ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      notifications.enabled ? 'translate-x-4' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {notifications.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-primary" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">Notification sound</span>
                </div>
                <button
                  onClick={() => handleNotificationChange({ soundEnabled: !notifications.soundEnabled })}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    notifications.soundEnabled ? 'bg-primary' : 'bg-muted'
                  )}
                  disabled={!notifications.enabled}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      notifications.soundEnabled ? 'translate-x-4' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Default Reminder Time */}
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Default reminder before due</label>
                <select
                  value={notifications.defaultReminderMinutes}
                  onChange={(e) => handleNotificationChange({ defaultReminderMinutes: parseInt(e.target.value) })}
                  disabled={!notifications.enabled}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Snooze Duration */}
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Snooze duration</label>
                <select
                  value={notifications.snoozeDurationMinutes}
                  onChange={(e) => handleNotificationChange({ snoozeDurationMinutes: parseInt(e.target.value) })}
                  disabled={!notifications.enabled}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {SNOOZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Productivity Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Productivity</h4>
            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm">Daily focus goal</span>
                </div>
                <select
                  value={dailyFocusGoalMinutes}
                  onChange={(e) => handleFocusGoalChange(parseInt(e.target.value))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>No goal</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Track daily focus time against this target on the Dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Data Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Data</h4>
            <div className="rounded-lg border border-border p-4 space-y-4">
              {/* Export */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Export</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="json">JSON (full backup)</option>
                    <option value="csv">CSV (tasks only)</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-1"
                  >
                    {exportFormat === 'json' ? (
                      <FileJson className="h-4 w-4" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                </div>
                {exportSuccess && (
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <Check className="h-3 w-3" />
                    {exportSuccess}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                {/* Import */}
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Import</span>
                </div>

                {!importPreview ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectImportFile}
                    className="w-full"
                  >
                    Select File to Import
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded border border-border p-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Format:</span>
                        <span className="font-medium capitalize">{importPreview.format}</span>
                      </div>
                      {importPreview.valid ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Lists:</span>
                            <span>{importPreview.counts.lists}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tasks:</span>
                            <span>{importPreview.counts.tasks}</span>
                          </div>
                          {importPreview.counts.goals > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Goals:</span>
                              <span>{importPreview.counts.goals}</span>
                            </div>
                          )}
                          {importPreview.counts.tags > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tags:</span>
                              <span>{importPreview.counts.tags}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-red-500">{importPreview.error}</div>
                      )}
                    </div>

                    {importPreview.valid && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Import mode</label>
                        <select
                          value={importMode}
                          onChange={(e) => setImportMode(e.target.value as ImportMode)}
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="merge">Merge with existing data</option>
                          <option value="replace">Replace all data</option>
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelImport}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      {importPreview.valid && (
                        <Button
                          size="sm"
                          onClick={handleExecuteImport}
                          disabled={isImporting}
                          className="flex-1"
                        >
                          {isImporting ? 'Importing...' : 'Import'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {importResult && (
                  <div className={cn(
                    'flex items-center gap-1 text-xs',
                    importResult.success ? 'text-green-500' : 'text-red-500'
                  )}>
                    {importResult.success ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {importResult.message}
                  </div>
                )}
              </div>
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
