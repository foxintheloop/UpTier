import { contextBridge, ipcRenderer } from 'electron';
// Log preload initialization
console.log('[preload] Preload script initializing...');
const startTime = performance.now();
// Define the API exposed to the renderer
const electronAPI = {
    // Lists
    lists: {
        getAll: () => ipcRenderer.invoke('lists:getAll'),
        create: (input) => ipcRenderer.invoke('lists:create', input),
        update: (id, input) => ipcRenderer.invoke('lists:update', id, input),
        delete: (id) => ipcRenderer.invoke('lists:delete', id),
    },
    // Tasks
    tasks: {
        getByList: (options) => ipcRenderer.invoke('tasks:getByList', options),
        create: (input) => ipcRenderer.invoke('tasks:create', input),
        update: (id, input) => ipcRenderer.invoke('tasks:update', id, input),
        delete: (id) => ipcRenderer.invoke('tasks:delete', id),
        complete: (id) => ipcRenderer.invoke('tasks:complete', id),
        uncomplete: (id) => ipcRenderer.invoke('tasks:uncomplete', id),
        reorder: (listId, taskIds) => ipcRenderer.invoke('tasks:reorder', listId, taskIds),
        addTag: (taskId, tagId) => ipcRenderer.invoke('tasks:addTag', taskId, tagId),
        removeTag: (taskId, tagId) => ipcRenderer.invoke('tasks:removeTag', taskId, tagId),
        getTags: (taskId) => ipcRenderer.invoke('tasks:getTags', taskId),
    },
    // Goals
    goals: {
        getAll: () => ipcRenderer.invoke('goals:getAll'),
        create: (input) => ipcRenderer.invoke('goals:create', input),
        linkTasks: (goalId, taskIds, strength) => ipcRenderer.invoke('goals:linkTasks', goalId, taskIds, strength ?? 3),
        getProgress: (goalId) => ipcRenderer.invoke('goals:getProgress', goalId),
    },
    // Subtasks
    subtasks: {
        getByTask: (taskId) => ipcRenderer.invoke('subtasks:getByTask', taskId),
        add: (taskId, title) => ipcRenderer.invoke('subtasks:add', taskId, title),
        complete: (id) => ipcRenderer.invoke('subtasks:complete', id),
        uncomplete: (id) => ipcRenderer.invoke('subtasks:uncomplete', id),
        delete: (id) => ipcRenderer.invoke('subtasks:delete', id),
    },
    // Tags
    tags: {
        getAll: () => ipcRenderer.invoke('tags:getAll'),
        create: (input) => ipcRenderer.invoke('tags:create', input),
        update: (id, input) => ipcRenderer.invoke('tags:update', id, input),
        delete: (id) => ipcRenderer.invoke('tags:delete', id),
    },
    // Settings
    settings: {
        get: () => ipcRenderer.invoke('settings:get'),
        set: (settings) => ipcRenderer.invoke('settings:set', settings),
        getEffectiveTheme: () => ipcRenderer.invoke('settings:getEffectiveTheme'),
    },
    // Notifications
    notifications: {
        getUpcoming: (limit) => ipcRenderer.invoke('notifications:getUpcoming', limit),
        snooze: (taskId) => ipcRenderer.invoke('notifications:snooze', taskId),
        dismiss: (taskId) => ipcRenderer.invoke('notifications:dismiss', taskId),
        getPendingCount: () => ipcRenderer.invoke('notifications:getPendingCount'),
        setReminderFromDueDate: (taskId, dueDate, dueTime) => ipcRenderer.invoke('notifications:setReminderFromDueDate', taskId, dueDate, dueTime),
    },
    // Export/Import
    exportImport: {
        exportJson: () => ipcRenderer.invoke('export:json'),
        exportCsv: () => ipcRenderer.invoke('export:csv'),
        exportToFile: (format) => ipcRenderer.invoke('export:toFile', format),
        selectImportFile: () => ipcRenderer.invoke('import:selectFile'),
        previewImport: (filePath) => ipcRenderer.invoke('import:preview', filePath),
        executeImport: (filePath, options) => ipcRenderer.invoke('import:execute', filePath, options),
    },
    // Database Profiles
    database: {
        getProfiles: () => ipcRenderer.invoke('database:getProfiles'),
        getActiveProfile: () => ipcRenderer.invoke('database:getActiveProfile'),
        create: (input) => ipcRenderer.invoke('database:create', input),
        update: (id, updates) => ipcRenderer.invoke('database:update', id, updates),
        delete: (id) => ipcRenderer.invoke('database:delete', id),
        switch: (profileId) => ipcRenderer.invoke('database:switch', profileId),
        getCurrentPath: () => ipcRenderer.invoke('database:getCurrentPath'),
    },
    // AI Suggestions
    suggestions: {
        getDueDate: (taskId) => ipcRenderer.invoke('suggestions:getDueDate', taskId),
        getBreakdown: (taskId) => ipcRenderer.invoke('suggestions:getBreakdown', taskId),
        getAll: (taskId) => ipcRenderer.invoke('suggestions:getAll', taskId),
    },
    // Logging API for renderer
    log: {
        debug: (message, data) => ipcRenderer.send('log:renderer', 'debug', message, data),
        info: (message, data) => ipcRenderer.send('log:renderer', 'info', message, data),
        warn: (message, data) => ipcRenderer.send('log:renderer', 'warn', message, data),
        error: (message, error, data) => {
            const errorData = error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error
                    ? { message: error }
                    : {};
            ipcRenderer.send('log:renderer', 'error', message, { ...errorData, ...data });
        },
    },
    // Database change listener
    onDatabaseChanged: (callback) => {
        const handler = () => {
            console.log('[preload] Database changed event received');
            callback();
        };
        ipcRenderer.on('database-changed', handler);
        return () => {
            ipcRenderer.removeListener('database-changed', handler);
        };
    },
    // Navigate to task listener (from notification clicks)
    onNavigateToTask: (callback) => {
        const handler = (_event, taskId) => {
            console.log('[preload] Navigate to task event received', { taskId });
            callback(taskId);
        };
        ipcRenderer.on('navigate-to-task', handler);
        return () => {
            ipcRenderer.removeListener('navigate-to-task', handler);
        };
    },
};
// Expose to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
const duration = (performance.now() - startTime).toFixed(2);
console.log(`[preload] Preload script initialized in ${duration}ms`);
//# sourceMappingURL=index.js.map