import type { Tag } from '@uptier/shared';
interface TagPickerProps {
    taskId: string;
    selectedTags: Tag[];
    onTagsChange: () => void;
}
export declare function TagPicker({ taskId, selectedTags, onTagsChange }: TagPickerProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=TagPicker.d.ts.map