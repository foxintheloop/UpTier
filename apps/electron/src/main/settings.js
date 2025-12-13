import Store from 'electron-store';
import { nativeTheme } from 'electron';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { DB_FILENAME, DB_DIRECTORY } from '@uptier/shared';
function getDefaultDbPath() {
    const appData = process.env.APPDATA || process.env.HOME || '';
    return join(appData, DB_DIRECTORY, DB_FILENAME);
}
function generateProfileId() {
    return `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
const DEFAULT_PROFILE_ID = 'default';
const defaultDatabaseProfile = {
    id: DEFAULT_PROFILE_ID,
    name: 'Default',
    path: getDefaultDbPath(),
    color: '#6366f1', // indigo-500
    icon: 'database',
    createdAt: new Date().toISOString(),
};
const store = new Store({
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
        },
    },
});
export function getSettings() {
    return store.get('settings');
}
export function setSettings(settings) {
    const current = store.get('settings');
    const updated = { ...current, ...settings };
    store.set('settings', updated);
    return updated;
}
export function getTheme() {
    return store.get('settings.theme') || 'dark';
}
export function setTheme(theme) {
    store.set('settings.theme', theme);
}
/**
 * Get the effective theme (resolves 'system' to actual theme)
 */
export function getEffectiveTheme() {
    const theme = getTheme();
    if (theme === 'system') {
        return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    }
    return theme;
}
// Database profile management
export function getDatabaseProfiles() {
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
export function getActiveProfile() {
    const settings = getSettings();
    const profiles = getDatabaseProfiles();
    const activeId = settings.databases?.activeProfileId || DEFAULT_PROFILE_ID;
    return profiles.find(p => p.id === activeId) || profiles[0] || defaultDatabaseProfile;
}
export function setActiveProfile(profileId) {
    const profiles = getDatabaseProfiles();
    const profile = profiles.find(p => p.id === profileId);
    if (!profile)
        return null;
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
export function createDatabaseProfile(input) {
    const appData = process.env.APPDATA || process.env.HOME || '';
    const id = generateProfileId();
    const fileName = `uptier-${id}.db`;
    const dbDir = join(appData, DB_DIRECTORY);
    // Ensure directory exists
    if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
    }
    const profile = {
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
export function updateDatabaseProfile(id, updates) {
    const profiles = getDatabaseProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1)
        return null;
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
export function deleteDatabaseProfile(id) {
    // Can't delete default profile
    if (id === DEFAULT_PROFILE_ID)
        return false;
    const profiles = getDatabaseProfiles();
    const settings = getSettings();
    const filteredProfiles = profiles.filter(p => p.id !== id);
    // Must have at least one profile
    if (filteredProfiles.length === 0)
        return false;
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
//# sourceMappingURL=settings.js.map