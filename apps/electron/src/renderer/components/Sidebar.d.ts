interface SidebarProps {
    selectedListId: string | null;
    onSelectList: (id: string) => void;
    onSettingsClick: () => void;
    onDatabaseSwitch?: () => void;
}
export declare function Sidebar({ selectedListId, onSelectList, onSettingsClick, onDatabaseSwitch }: SidebarProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Sidebar.d.ts.map