export default function App(): import("react").JSX.Element;
declare global {
    interface Window {
        electronAPI: import('./preload').ElectronAPI;
    }
}
//# sourceMappingURL=App.d.ts.map