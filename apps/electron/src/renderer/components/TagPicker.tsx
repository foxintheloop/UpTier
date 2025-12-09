import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Hash } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { TagBadge } from './TagBadge';
import { cn } from '@/lib/utils';
import type { Tag } from '@uptier/shared';

// Default tag colors
const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#6b7280', // gray
];

interface TagPickerProps {
  taskId: string;
  selectedTags: Tag[];
  onTagsChange: () => void;
}

export function TagPicker({ taskId, selectedTags, onTagsChange }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const queryClient = useQueryClient();

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => window.electronAPI.tags.getAll(),
  });

  const selectedTagIds = useMemo(() => new Set(selectedTags.map((t) => t.id)), [selectedTags]);

  const createTagMutation = useMutation({
    mutationFn: (input: { name: string; color: string }) =>
      window.electronAPI.tags.create(input),
    onSuccess: async (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      // Automatically add the new tag to the task
      await window.electronAPI.tasks.addTag(taskId, newTag.id);
      onTagsChange();
      setNewTagName('');
      setShowCreateForm(false);
    },
  });

  const addTagMutation = useMutation({
    mutationFn: (tagId: string) => window.electronAPI.tasks.addTag(taskId, tagId),
    onSuccess: () => {
      onTagsChange();
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => window.electronAPI.tasks.removeTag(taskId, tagId),
    onSuccess: () => {
      onTagsChange();
    },
  });

  const handleToggleTag = (tag: Tag) => {
    if (selectedTagIds.has(tag.id)) {
      removeTagMutation.mutate(tag.id);
    } else {
      addTagMutation.mutate(tag.id);
    }
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTagMutation.mutate({ name: newTagName.trim(), color: selectedColor });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1">
          <Hash className="h-3 w-3" />
          <span>Tags</span>
          {selectedTags.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 rounded-full">
              {selectedTags.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {/* Selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-border">
            {selectedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                onRemove={() => removeTagMutation.mutate(tag.id)}
              />
            ))}
          </div>
        )}

        {/* Available tags */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {allTags.length === 0 && !showCreateForm ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No tags yet. Create one!
            </p>
          ) : (
            allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors',
                  selectedTagIds.has(tag.id) && 'bg-accent'
                )}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 text-left">{tag.name}</span>
                {selectedTagIds.has(tag.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Create new tag */}
        {showCreateForm ? (
          <div className="mt-2 pt-2 border-t border-border space-y-2">
            <Input
              autoFocus
              placeholder="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTag();
                if (e.key === 'Escape') {
                  setShowCreateForm(false);
                  setNewTagName('');
                }
              }}
              className="h-8"
            />
            <div className="flex flex-wrap gap-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    'h-5 w-5 rounded-full transition-transform',
                    selectedColor === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewTagName('');
                }}
                className="flex-1 h-7"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTagMutation.isPending}
                className="flex-1 h-7"
              >
                Create
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 mt-2 pt-2 border-t border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create new tag</span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
