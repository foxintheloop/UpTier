import Store from 'electron-store';
import { screen, BrowserWindow } from 'electron';
import type { Rectangle } from 'electron';

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

interface StoreSchema {
  windowState: WindowState;
}

const store = new Store<StoreSchema>({
  name: 'window-state',
  defaults: {
    windowState: {
      width: 1200,
      height: 800,
      isMaximized: false,
    },
  },
});

let saveTimeout: NodeJS.Timeout | null = null;

export function createWindowState(): void {
  // Initialize store if needed
  if (!store.has('windowState')) {
    store.set('windowState', {
      width: 1200,
      height: 800,
      isMaximized: false,
    });
  }
}

export function getWindowBounds(): Rectangle & { isMaximized?: boolean } {
  const state = store.get('windowState');
  const defaultBounds = {
    width: 1200,
    height: 800,
  };

  // Validate bounds are on screen
  if (state.x !== undefined && state.y !== undefined) {
    const displays = screen.getAllDisplays();
    const isOnScreen = displays.some((display) => {
      const { x, y, width, height } = display.bounds;
      return (
        state.x! >= x &&
        state.x! < x + width &&
        state.y! >= y &&
        state.y! < y + height
      );
    });

    if (isOnScreen) {
      return {
        x: state.x,
        y: state.y,
        width: state.width || defaultBounds.width,
        height: state.height || defaultBounds.height,
        isMaximized: state.isMaximized,
      };
    }
  }

  // Center on primary display if no valid saved position
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const width = state.width || defaultBounds.width;
  const height = state.height || defaultBounds.height;

  return {
    x: Math.round((screenWidth - width) / 2),
    y: Math.round((screenHeight - height) / 2),
    width,
    height,
    isMaximized: state.isMaximized,
  };
}

export function saveWindowState(window: BrowserWindow): void {
  // Debounce saves
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    if (!window || window.isDestroyed()) return;

    const isMaximized = window.isMaximized();

    // Don't save bounds if maximized - keep previous normal bounds
    if (!isMaximized) {
      const bounds = window.getBounds();
      store.set('windowState', {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: false,
      });
    } else {
      // Only update maximized state
      const current = store.get('windowState');
      store.set('windowState', {
        ...current,
        isMaximized: true,
      });
    }
  }, 500);
}
