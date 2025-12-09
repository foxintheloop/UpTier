import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { TaskDetail } from './components/TaskDetail';
import { Toaster } from './components/ui/toaster';
import type { TaskWithGoals } from '@uptier/shared';

export default function App() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithGoals | null>(null);
  const queryClient = useQueryClient();

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

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar
        selectedListId={selectedListId}
        onSelectList={(id) => {
          setSelectedListId(id);
          setSelectedTask(null);
        }}
      />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Task List */}
        <div className={`flex-1 overflow-hidden ${selectedTask ? 'border-r border-border' : ''}`}>
          {selectedListId ? (
            <TaskList
              listId={selectedListId}
              selectedTaskId={selectedTask?.id}
              onSelectTask={setSelectedTask}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Welcome to UpTier</h2>
                <p>Select a list from the sidebar to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Task Detail Panel */}
        {selectedTask && (
          <div className="w-96 overflow-hidden">
            <TaskDetail
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onUpdate={(updated) => setSelectedTask(updated)}
            />
          </div>
        )}
      </main>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

// Type declaration for window.electronAPI
declare global {
  interface Window {
    electronAPI: import('./preload').ElectronAPI;
  }
}
