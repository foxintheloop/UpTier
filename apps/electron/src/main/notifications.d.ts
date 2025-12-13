import { BrowserWindow } from 'electron';
interface UpcomingNotification {
    taskId: string;
    title: string;
    reminderAt: string;
    listId: string;
}
declare class NotificationScheduler {
    private checkInterval;
    private shownNotifications;
    private mainWindow;
    private isRunning;
    /**
     * Start the notification scheduler
     */
    start(mainWindow: BrowserWindow): void;
    /**
     * Stop the notification scheduler
     */
    stop(): void;
    /**
     * Check for pending reminders and show notifications
     */
    private checkReminders;
    /**
     * Show a notification for a task
     */
    private showNotification;
    /**
     * Snooze a notification for a task
     */
    snooze(taskId: string): boolean;
    /**
     * Dismiss a notification (clear the reminder)
     */
    dismiss(taskId: string): boolean;
    /**
     * Get upcoming notifications
     */
    getUpcoming(limit?: number): UpcomingNotification[];
    /**
     * Get count of pending notifications
     */
    getPendingCount(): number;
    /**
     * Set reminder for a task based on due date
     */
    setReminderFromDueDate(taskId: string, dueDate: string, dueTime?: string | null): boolean;
    /**
     * Clear shown notifications cache (for testing or manual refresh)
     */
    clearCache(): void;
}
export declare const notificationScheduler: NotificationScheduler;
export {};
//# sourceMappingURL=notifications.d.ts.map