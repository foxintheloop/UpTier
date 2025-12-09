"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Define the API exposed to the renderer
const electronAPI = {
    // Lists
    lists: {
        getAll: () => electron_1.ipcRenderer.invoke('lists:getAll'),
        create: (input) => electron_1.ipcRenderer.invoke('lists:create', input),
        update: (id, input) => electron_1.ipcRenderer.invoke('lists:update', id, input),
        delete: (id) => electron_1.ipcRenderer.invoke('lists:delete', id),
    },
    // Tasks
    tasks: {
        getByList: (options) => electron_1.ipcRenderer.invoke('tasks:getByList', options),
        create: (input) => electron_1.ipcRenderer.invoke('tasks:create', input),
        update: (id, input) => electron_1.ipcRenderer.invoke('tasks:update', id, input),
        delete: (id) => electron_1.ipcRenderer.invoke('tasks:delete', id),
        complete: (id) => electron_1.ipcRenderer.invoke('tasks:complete', id),
        uncomplete: (id) => electron_1.ipcRenderer.invoke('tasks:uncomplete', id),
        reorder: (listId, taskIds) => electron_1.ipcRenderer.invoke('tasks:reorder', listId, taskIds),
    },
    // Goals
    goals: {
        getAll: () => electron_1.ipcRenderer.invoke('goals:getAll'),
        create: (input) => electron_1.ipcRenderer.invoke('goals:create', input),
        linkTasks: (goalId, taskIds, strength) => electron_1.ipcRenderer.invoke('goals:linkTasks', goalId, taskIds, strength ?? 3),
        getProgress: (goalId) => electron_1.ipcRenderer.invoke('goals:getProgress', goalId),
    },
    // Subtasks
    subtasks: {
        getByTask: (taskId) => electron_1.ipcRenderer.invoke('subtasks:getByTask', taskId),
        add: (taskId, title) => electron_1.ipcRenderer.invoke('subtasks:add', taskId, title),
        complete: (id) => electron_1.ipcRenderer.invoke('subtasks:complete', id),
        uncomplete: (id) => electron_1.ipcRenderer.invoke('subtasks:uncomplete', id),
        delete: (id) => electron_1.ipcRenderer.invoke('subtasks:delete', id),
    },
    // Database change listener
    onDatabaseChanged: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on('database-changed', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('database-changed', handler);
        };
    },
};
// Expose to renderer
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=index.js.map