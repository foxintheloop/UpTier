export type ThemeMode = 'dark' | 'light' | 'system';
export interface NotificationSettings {
    enabled: boolean;
    defaultReminderMinutes: number;
    snoozeDurationMinutes: number;
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
export interface AppSettings {
    theme: ThemeMode;
    notifications: NotificationSettings;
    databases: DatabaseSettings;
}
export declare function getSettings(): AppSettings;
export declare function setSettings(settings: Partial<AppSettings>): AppSettings;
export declare function getTheme(): ThemeMode;
export declare function setTheme(theme: ThemeMode): void;
/**
 * Get the effective theme (resolves 'system' to actual theme)
 */
export declare function getEffectiveTheme(): 'dark' | 'light';
export declare function getDatabaseProfiles(): DatabaseProfile[];
export declare function getActiveProfile(): DatabaseProfile;
export declare function setActiveProfile(profileId: string): DatabaseProfile | null;
export interface CreateProfileInput {
    name: string;
    color?: string;
    icon?: string;
}
export declare function createDatabaseProfile(input: CreateProfileInput): DatabaseProfile;
export declare function updateDatabaseProfile(id: string, updates: Partial<Pick<DatabaseProfile, 'name' | 'color' | 'icon'>>): DatabaseProfile | null;
export declare function deleteDatabaseProfile(id: string): boolean;
//# sourceMappingURL=settings.d.ts.map