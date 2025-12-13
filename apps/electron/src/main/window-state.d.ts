import { BrowserWindow } from 'electron';
import type { Rectangle } from 'electron';
export declare function createWindowState(): void;
export declare function getWindowBounds(): Rectangle & {
    isMaximized?: boolean;
};
export declare function saveWindowState(window: BrowserWindow): void;
//# sourceMappingURL=window-state.d.ts.map