type ThemeMode = 'dark' | 'light' | 'system';
interface SettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onThemeChange: (theme: ThemeMode) => void;
}
export declare function Settings({ open, onOpenChange, onThemeChange }: SettingsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Settings.d.ts.map