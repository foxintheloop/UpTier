import { Notification, BrowserWindow } from 'electron';
import { getDb } from './database';
import { getSettings } from './settings';
import { createScopedLogger } from './logger';
import { updateNotificationCount } from './tray';

const log = createScopedLogger('notifications');

interface TaskReminder {
  id: string;
  title: string;
  reminder_at: string;
  list_id: string;
}

interface UpcomingNotification {
  taskId: string;
  title: string;
  reminderAt: string;
  listId: string;
}

class NotificationScheduler {
  private checkInterval: NodeJS.Timeout | null = null;
  private shownNotifications: Set<string> = new Set();
  private mainWindow: BrowserWindow | null = null;
  private isRunning = false;

  /**
   * Start the notification scheduler
   */
  start(mainWindow: BrowserWindow): void {
    if (this.isRunning) {
      log.warn('Notification scheduler already running');
      return;
    }

    this.mainWindow = mainWindow;
    this.isRunning = true;

    // Check every 60 seconds
    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 60000);

    // Initial check after a short delay
    setTimeout(() => this.checkReminders(), 5000);

    log.info('Notification scheduler started');
  }

  /**
   * Stop the notification scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    this.mainWindow = null;
    log.info('Notification scheduler stopped');
  }

  /**
   * Check for pending reminders and show notifications
   */
  private checkReminders(): void {
    const settings = getSettings();
    if (!settings.notifications.enabled) {
      updateNotificationCount(0);
      return;
    }

    try {
      const db = getDb();
      const now = new Date().toISOString();

      // Query tasks with reminders that are due and not yet completed
      const tasks = db.prepare(`
        SELECT id, title, reminder_at, list_id
        FROM tasks
        WHERE reminder_at IS NOT NULL
          AND reminder_at <= ?
          AND completed = 0
        ORDER BY reminder_at ASC
      `).all(now) as TaskReminder[];

      // Update tray with pending count
      updateNotificationCount(tasks.length);

      for (const task of tasks) {
        // Skip if we've already shown this notification
        if (this.shownNotifications.has(task.id)) {
          continue;
        }

        this.showNotification(task);
      }
    } catch (error) {
      log.error('Error checking reminders', { error: String(error) });
    }
  }

  /**
   * Show a notification for a task
   */
  private showNotification(task: TaskReminder): void {
    const settings = getSettings();

    const notification = new Notification({
      title: 'UpTier Reminder',
      body: task.title,
      silent: !settings.notifications.soundEnabled,
      urgency: 'normal',
    });

    notification.on('click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        this.mainWindow.show();
        this.mainWindow.focus();
        // Send message to renderer to navigate to task
        this.mainWindow.webContents.send('navigate-to-task', task.id);
      }
    });

    notification.show();
    this.shownNotifications.add(task.id);
    log.info('Showed notification', { taskId: task.id, title: task.title });
  }

  /**
   * Snooze a notification for a task
   */
  snooze(taskId: string): boolean {
    try {
      const settings = getSettings();
      const snoozeMinutes = settings.notifications.snoozeDurationMinutes;
      const newReminderAt = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();

      const db = getDb();
      db.prepare(`
        UPDATE tasks
        SET reminder_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newReminderAt, taskId);

      // Remove from shown notifications so it can be shown again
      this.shownNotifications.delete(taskId);

      log.info('Snoozed notification', { taskId, newReminderAt, snoozeMinutes });
      return true;
    } catch (error) {
      log.error('Error snoozing notification', { taskId, error: String(error) });
      return false;
    }
  }

  /**
   * Dismiss a notification (clear the reminder)
   */
  dismiss(taskId: string): boolean {
    try {
      const db = getDb();
      db.prepare(`
        UPDATE tasks
        SET reminder_at = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(taskId);

      // Remove from shown notifications
      this.shownNotifications.delete(taskId);

      log.info('Dismissed notification', { taskId });
      return true;
    } catch (error) {
      log.error('Error dismissing notification', { taskId, error: String(error) });
      return false;
    }
  }

  /**
   * Get upcoming notifications
   */
  getUpcoming(limit = 10): UpcomingNotification[] {
    try {
      const db = getDb();
      const now = new Date().toISOString();
      const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const tasks = db.prepare(`
        SELECT id, title, reminder_at, list_id
        FROM tasks
        WHERE reminder_at IS NOT NULL
          AND reminder_at <= ?
          AND completed = 0
        ORDER BY reminder_at ASC
        LIMIT ?
      `).all(oneDayFromNow, limit) as TaskReminder[];

      return tasks.map(task => ({
        taskId: task.id,
        title: task.title,
        reminderAt: task.reminder_at,
        listId: task.list_id,
      }));
    } catch (error) {
      log.error('Error getting upcoming notifications', { error: String(error) });
      return [];
    }
  }

  /**
   * Get count of pending notifications
   */
  getPendingCount(): number {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM tasks
        WHERE reminder_at IS NOT NULL
          AND reminder_at <= ?
          AND completed = 0
      `).get(now) as { count: number };

      return result.count;
    } catch (error) {
      log.error('Error getting pending count', { error: String(error) });
      return 0;
    }
  }

  /**
   * Set reminder for a task based on due date
   */
  setReminderFromDueDate(taskId: string, dueDate: string, dueTime?: string | null): boolean {
    try {
      const settings = getSettings();
      const reminderMinutes = settings.notifications.defaultReminderMinutes;

      // Parse due date and optional time
      let dueDateTime: Date;
      if (dueTime) {
        dueDateTime = new Date(`${dueDate}T${dueTime}:00`);
      } else {
        // If no time specified, default to 9:00 AM
        dueDateTime = new Date(`${dueDate}T09:00:00`);
      }

      // Calculate reminder time (subtract default minutes)
      const reminderAt = new Date(dueDateTime.getTime() - reminderMinutes * 60 * 1000);

      // Don't set reminder in the past
      if (reminderAt.getTime() < Date.now()) {
        return false;
      }

      const db = getDb();
      db.prepare(`
        UPDATE tasks
        SET reminder_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(reminderAt.toISOString(), taskId);

      log.info('Set reminder from due date', { taskId, reminderAt: reminderAt.toISOString() });
      return true;
    } catch (error) {
      log.error('Error setting reminder', { taskId, error: String(error) });
      return false;
    }
  }

  /**
   * Clear shown notifications cache (for testing or manual refresh)
   */
  clearCache(): void {
    this.shownNotifications.clear();
  }
}

// Singleton instance
export const notificationScheduler = new NotificationScheduler();
