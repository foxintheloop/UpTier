import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { TaskDetail } from './components/TaskDetail';
import { Settings } from './components/Settings';
import { Toaster } from './components/ui/toaster';
// Apply theme to document
function applyTheme(theme) {
    const effectiveTheme = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
    document.documentElement.classList.remove('light', 'dark');
    if (effectiveTheme === 'light') {
        document.documentElement.classList.add('light');
    }
}
export default function App() {
    const [selectedListId, setSelectedListId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const queryClient = useQueryClient();
    const taskListRef = useRef(null);
    // Load and apply theme on mount
    useEffect(() => {
        window.electronAPI.settings.get().then((settings) => {
            applyTheme(settings.theme);
        });
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            window.electronAPI.settings.get().then((settings) => {
                if (settings.theme === 'system') {
                    applyTheme('system');
                }
            });
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);
    const handleThemeChange = (theme) => {
        applyTheme(theme);
    };
    // Listen for database changes from MCP server
    useEffect(() => {
        const unsubscribe = window.electronAPI.onDatabaseChanged(() => {
            // Invalidate all queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['lists'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['goals'] });
        });
        return unsubscribe;
    }, [queryClient]);
    // Get current task index for navigation
    const getCurrentTaskIndex = useCallback(() => {
        if (!selectedTask || !taskListRef.current)
            return -1;
        const tasks = taskListRef.current.getAllTasks();
        return tasks.findIndex((t) => t.id === selectedTask.id);
    }, [selectedTask]);
    // Handle task completion toggle
    const handleToggleComplete = useCallback(async () => {
        if (!selectedTask)
            return;
        if (selectedTask.completed) {
            await window.electronAPI.tasks.uncomplete(selectedTask.id);
        }
        else {
            await window.electronAPI.tasks.complete(selectedTask.id);
        }
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['lists'] });
    }, [selectedTask, queryClient]);
    // Handle task deletion
    const handleDeleteTask = useCallback(async () => {
        if (!selectedTask)
            return;
        const confirmed = window.confirm(`Delete "${selectedTask.title}"?`);
        if (confirmed) {
            await window.electronAPI.tasks.delete(selectedTask.id);
            setSelectedTask(null);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['lists'] });
        }
    }, [selectedTask, queryClient]);
    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            const target = e.target;
            const isInputActive = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            // Ctrl/Cmd + N: Focus quick add
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                taskListRef.current?.focusQuickAdd();
                return;
            }
            // Ctrl/Cmd + F: Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                taskListRef.current?.focusSearch();
                return;
            }
            // Escape: Close task detail / clear selection
            if (e.key === 'Escape' && !isInputActive) {
                if (selectedTask) {
                    setSelectedTask(null);
                }
                return;
            }
            // Skip navigation shortcuts when typing
            if (isInputActive)
                return;
            // Arrow up: Select previous task
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const currentIndex = getCurrentTaskIndex();
                if (currentIndex > 0) {
                    taskListRef.current?.selectTaskByIndex(currentIndex - 1);
                }
                else if (currentIndex === -1) {
                    // No task selected, select last task
                    const tasks = taskListRef.current?.getAllTasks() || [];
                    if (tasks.length > 0) {
                        taskListRef.current?.selectTaskByIndex(tasks.length - 1);
                    }
                }
                return;
            }
            // Arrow down: Select next task
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const currentIndex = getCurrentTaskIndex();
                const tasks = taskListRef.current?.getAllTasks() || [];
                if (currentIndex < tasks.length - 1) {
                    taskListRef.current?.selectTaskByIndex(currentIndex + 1);
                }
                else if (currentIndex === -1 && tasks.length > 0) {
                    // No task selected, select first task
                    taskListRef.current?.selectTaskByIndex(0);
                }
                return;
            }
            // Space: Toggle completion
            if (e.key === ' ' && selectedTask) {
                e.preventDefault();
                handleToggleComplete();
                return;
            }
            // Delete: Delete task
            if (e.key === 'Delete' && selectedTask) {
                e.preventDefault();
                handleDeleteTask();
                return;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedTask, getCurrentTaskIndex, handleToggleComplete, handleDeleteTask]);
    return (<div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar selectedListId={selectedListId} onSelectList={(id) => {
            setSelectedListId(id);
            setSelectedTask(null);
        }} onSettingsClick={() => setSettingsOpen(true)}/>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Task List */}
        <div className={`flex-1 overflow-hidden ${selectedTask ? 'border-r border-border' : ''}`}>
          {selectedListId ? (<TaskList ref={taskListRef} listId={selectedListId} selectedTaskId={selectedTask?.id} onSelectTask={setSelectedTask}/>) : (<div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Welcome to UpTier</h2>
                <p>Select a list from the sidebar to get started</p>
              </div>
            </div>)}
        </div>

        {/* Task Detail Panel */}
        {selectedTask && (<div className="w-96 overflow-hidden">
            <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={(updated) => setSelectedTask(updated)}/>
          </div>)}
      </main>

      {/* Settings Modal */}
      <Settings open={settingsOpen} onOpenChange={setSettingsOpen} onThemeChange={handleThemeChange}/>

      {/* Toast notifications */}
      <Toaster />
    </div>);
}
//# sourceMappingURL=App.js.map