import Store from 'electron-store';
import { nativeTheme } from 'electron';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppSettings {
  theme: ThemeMode;
}

interface SettingsSchema {
  settings: AppSettings;
}

const store = new Store<SettingsSchema>({
  name: 'settings',
  defaults: {
    settings: {
      theme: 'dark',
    },
  },
});

export function getSettings(): AppSettings {
  return store.get('settings');
}

export function setSettings(settings: Partial<AppSettings>): AppSettings {
  const current = store.get('settings');
  const updated = { ...current, ...settings };
  store.set('settings', updated);
  return updated;
}

export function getTheme(): ThemeMode {
  return store.get('settings.theme') || 'dark';
}

export function setTheme(theme: ThemeMode): void {
  store.set('settings.theme', theme);
}

/**
 * Get the effective theme (resolves 'system' to actual theme)
 */
export function getEffectiveTheme(): 'dark' | 'light' {
  const theme = getTheme();
  if (theme === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }
  return theme;
}
