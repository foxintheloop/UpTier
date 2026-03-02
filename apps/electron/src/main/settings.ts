import Store from 'electron-store';
import { nativeTheme } from 'electron';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { DB_FILENAME, DB_DIRECTORY } from '@uptier/shared';

export type ThemeMode = 'dark' | 'light' | 'earth-dark' | 'earth-light' | 'cyberpunk' | 'system';

export interface NotificationSettings {
  enabled: boolean;
  defaultReminderMinutes: number; // 15, 30, 60, 1440 (1 day)
  snoozeDurationMinutes: number;  // 5, 10, 15, 30
  soundEnabled: boolean;
}

export interface DatabaseProfile {
  id: string;
  name: string;
  path: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface DatabaseSettings {
  profiles: DatabaseProfile[];
  activeProfileId: string;
  defaultProfileId: string;
}

export interface PlanningSettings {
  lastPlanningDate: string | null;  // YYYY-MM-DD (for auto-launch check)
  plannedDates: string[];           // YYYY-MM-DD strings of planned dates, max 90
  enabled: boolean;                 // auto-launch toggle
  workingHoursPerDay: number;       // default 8
}

export interface AnalyticsSettings {
  dailyFocusGoalMinutes: number;
}

export type FeatureTier = 'basic' | 'intermediate' | 'advanced' | 'custom';

export interface FeatureFlags {
  priorityTiers: boolean;
  focusTimer: boolean;
  calendarView: boolean;
  customSmartFilters: boolean;
  notifications: boolean;
  exportImport: boolean;
  goalsSystem: boolean;
  dashboard: boolean;
  dailyPlanning: boolean;
  aiSuggestions: boolean;
  deadlineAlerts: boolean;
  streaksCelebrations: boolean;
  databaseProfiles: boolean;
}

export interface OnboardingSettings {
  completed: boolean;
  tier: FeatureTier;
  features: FeatureFlags;
}

export interface AppSettings {
  theme: ThemeMode;
  notifications: NotificationSettings;
  databases: DatabaseSettings;
  planning: PlanningSettings;
  analytics: AnalyticsSettings;
  onboarding: OnboardingSettings;
}

interface SettingsSchema {
  settings: AppSettings;
}

function getDefaultDbPath(): string {
  const appData = process.env.APPDATA || process.env.HOME || '';
  return join(appData, DB_DIRECTORY, DB_FILENAME);
}

function generateProfileId(): string {
  return `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const DEFAULT_PROFILE_ID = 'default';

const defaultDatabaseProfile: DatabaseProfile = {
  id: DEFAULT_PROFILE_ID,
  name: 'Default',
  path: getDefaultDbPath(),
  color: '#6366f1', // indigo-500
  icon: 'database',
  createdAt: new Date().toISOString(),
};

const store = new Store<SettingsSchema>({
  name: 'settings',
  defaults: {
    settings: {
      theme: 'dark',
      notifications: {
        enabled: true,
        defaultReminderMinutes: 15,
        snoozeDurationMinutes: 10,
        soundEnabled: true,
      },
      databases: {
        profiles: [defaultDatabaseProfile],
        activeProfileId: DEFAULT_PROFILE_ID,
        defaultProfileId: DEFAULT_PROFILE_ID,
      },
      planning: {
        lastPlanningDate: null,
        plannedDates: [],
        enabled: true,
        workingHoursPerDay: 8,
      },
      analytics: {
        dailyFocusGoalMinutes: 120,
      },
      onboarding: {
        completed: false,
        tier: 'advanced' as FeatureTier,
        features: {
          priorityTiers: true,
          focusTimer: true,
          calendarView: true,
          customSmartFilters: true,
          notifications: true,
          exportImport: true,
          goalsSystem: true,
          dashboard: true,
          dailyPlanning: true,
          aiSuggestions: true,
          deadlineAlerts: true,
          streaksCelebrations: true,
          databaseProfiles: true,
        },
      },
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
export function getEffectiveTheme(): Exclude<ThemeMode, 'system'> {
  const theme = getTheme();
  if (theme === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }
  return theme;
}

// Database profile management
export function getDatabaseProfiles(): DatabaseProfile[] {
  const settings = getSettings();
  // Ensure default profile exists
  if (!settings.databases?.profiles?.length) {
    const updated = {
      ...settings,
      databases: {
        profiles: [defaultDatabaseProfile],
        activeProfileId: DEFAULT_PROFILE_ID,
        defaultProfileId: DEFAULT_PROFILE_ID,
      },
    };
    store.set('settings', updated);
    return [defaultDatabaseProfile];
  }
  return settings.databases.profiles;
}

export function getActiveProfile(): DatabaseProfile {
  const settings = getSettings();
  const profiles = getDatabaseProfiles();
  const activeId = settings.databases?.activeProfileId || DEFAULT_PROFILE_ID;
  return profiles.find(p => p.id === activeId) || profiles[0] || defaultDatabaseProfile;
}

export function setActiveProfile(profileId: string): DatabaseProfile | null {
  const profiles = getDatabaseProfiles();
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return null;

  const settings = getSettings();
  store.set('settings', {
    ...settings,
    databases: {
      ...settings.databases,
      activeProfileId: profileId,
    },
  });
  return profile;
}

export interface CreateProfileInput {
  name: string;
  color?: string;
  icon?: string;
}

export function createDatabaseProfile(input: CreateProfileInput): DatabaseProfile {
  const appData = process.env.APPDATA || process.env.HOME || '';
  const id = generateProfileId();
  const fileName = `uptier-${id}.db`;
  const dbDir = join(appData, DB_DIRECTORY);

  // Ensure directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const profile: DatabaseProfile = {
    id,
    name: input.name,
    path: join(dbDir, fileName),
    color: input.color || '#6366f1',
    icon: input.icon || 'database',
    createdAt: new Date().toISOString(),
  };

  const settings = getSettings();
  const profiles = getDatabaseProfiles();
  store.set('settings', {
    ...settings,
    databases: {
      ...settings.databases,
      profiles: [...profiles, profile],
    },
  });

  return profile;
}

export function updateDatabaseProfile(id: string, updates: Partial<Pick<DatabaseProfile, 'name' | 'color' | 'icon'>>): DatabaseProfile | null {
  const profiles = getDatabaseProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) return null;

  const updated = { ...profiles[index], ...updates };
  profiles[index] = updated;

  const settings = getSettings();
  store.set('settings', {
    ...settings,
    databases: {
      ...settings.databases,
      profiles,
    },
  });

  return updated;
}

export function deleteDatabaseProfile(id: string): boolean {
  // Can't delete default profile
  if (id === DEFAULT_PROFILE_ID) return false;

  const profiles = getDatabaseProfiles();
  const settings = getSettings();
  const filteredProfiles = profiles.filter(p => p.id !== id);

  // Must have at least one profile
  if (filteredProfiles.length === 0) return false;

  // If deleting active profile, switch to default
  const newActiveId = settings.databases.activeProfileId === id
    ? DEFAULT_PROFILE_ID
    : settings.databases.activeProfileId;

  store.set('settings', {
    ...settings,
    databases: {
      ...settings.databases,
      profiles: filteredProfiles,
      activeProfileId: newActiveId,
    },
  });

  return true;
}
