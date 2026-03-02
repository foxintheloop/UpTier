import { useQuery } from '@tanstack/react-query';

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

export type FeatureTier = 'basic' | 'intermediate' | 'advanced' | 'custom';

const ALL_ENABLED: FeatureFlags = {
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
};

export const FEATURE_PRESETS: Record<Exclude<FeatureTier, 'custom'>, FeatureFlags> = {
  basic: {
    priorityTiers: false,
    focusTimer: false,
    calendarView: false,
    customSmartFilters: false,
    notifications: false,
    exportImport: false,
    goalsSystem: false,
    dashboard: false,
    dailyPlanning: false,
    aiSuggestions: false,
    deadlineAlerts: false,
    streaksCelebrations: false,
    databaseProfiles: false,
  },
  intermediate: {
    priorityTiers: true,
    focusTimer: true,
    calendarView: true,
    customSmartFilters: true,
    notifications: true,
    exportImport: true,
    goalsSystem: true,
    dashboard: false,
    dailyPlanning: false,
    aiSuggestions: false,
    deadlineAlerts: false,
    streaksCelebrations: false,
    databaseProfiles: false,
  },
  advanced: {
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
};

export const FEATURE_DEFINITIONS: { key: keyof FeatureFlags; label: string; description: string }[] = [
  { key: 'priorityTiers', label: 'Priority Tiers', description: 'Categorize tasks as Do Now, Do Soon, or Backlog' },
  { key: 'focusTimer', label: 'Focus Timer', description: 'Timed focus sessions with tracking' },
  { key: 'calendarView', label: 'Calendar View', description: 'Month and day calendar grid' },
  { key: 'customSmartFilters', label: 'Custom Filters', description: 'Build smart filter lists with rules' },
  { key: 'notifications', label: 'Notifications', description: 'Due date reminders and alerts' },
  { key: 'exportImport', label: 'Export / Import', description: 'JSON and CSV data backup' },
  { key: 'goalsSystem', label: 'Goals', description: 'Track goals with linked tasks' },
  { key: 'dashboard', label: 'Dashboard', description: 'Productivity analytics and charts' },
  { key: 'dailyPlanning', label: 'Daily Planning', description: 'Morning planning ritual' },
  { key: 'aiSuggestions', label: 'AI Suggestions', description: 'Smart due dates and task breakdowns' },
  { key: 'deadlineAlerts', label: 'Deadline Alerts', description: 'At-risk task warnings' },
  { key: 'streaksCelebrations', label: 'Streaks & Celebrations', description: 'Streak tracking and confetti' },
  { key: 'databaseProfiles', label: 'Database Profiles', description: 'Multiple database files' },
];

export function deriveTier(features: FeatureFlags): FeatureTier {
  for (const tier of ['basic', 'intermediate', 'advanced'] as const) {
    const preset = FEATURE_PRESETS[tier];
    const match = (Object.keys(preset) as (keyof FeatureFlags)[]).every(
      (key) => preset[key] === features[key]
    );
    if (match) return tier;
  }
  return 'custom';
}

export function useFeatures(): FeatureFlags {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.settings.get(),
    staleTime: 60_000,
  });

  // Existing users won't have onboarding key — default to all enabled
  return data?.onboarding?.features ?? ALL_ENABLED;
}

export function useOnboarding() {
  const { data, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.settings.get(),
    staleTime: 60_000,
  });

  return {
    // Existing users: onboarding key missing → default completed=true (skip wizard)
    completed: data?.onboarding?.completed ?? true,
    tier: (data?.onboarding?.tier ?? 'advanced') as FeatureTier,
    features: data?.onboarding?.features ?? ALL_ENABLED,
    refetch,
  };
}
