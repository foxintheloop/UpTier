import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Filter,
  Zap,
  Flame,
  Clock,
  Flag,
  Tag,
  Inbox,
  Archive,
  Eye,
  Star,
  Plus,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import type {
  List,
  ListWithCount,
  Tag as TagType,
  SmartFilterRule,
  SmartFilterCriteria,
  SmartFilterField,
  SmartFilterOperator,
} from '@uptier/shared';

// ============================================================================
// Constants
// ============================================================================

const ICON_OPTIONS: { value: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'filter', icon: Filter },
  { value: 'zap', icon: Zap },
  { value: 'flame', icon: Flame },
  { value: 'clock', icon: Clock },
  { value: 'flag', icon: Flag },
  { value: 'tag', icon: Tag },
  { value: 'inbox', icon: Inbox },
  { value: 'archive', icon: Archive },
  { value: 'eye', icon: Eye },
  { value: 'star', icon: Star },
];

const COLOR_OPTIONS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
];

interface FieldOption {
  value: SmartFilterField;
  label: string;
  operators: { value: SmartFilterOperator; label: string; needsValue: boolean }[];
}

const FIELD_OPTIONS: FieldOption[] = [
  {
    value: 'due_date',
    label: 'Due Date',
    operators: [
      { value: 'today', label: 'is today', needsValue: false },
      { value: 'this_week', label: 'is this week', needsValue: false },
      { value: 'overdue', label: 'is overdue', needsValue: false },
      { value: 'is_set', label: 'is set', needsValue: false },
      { value: 'is_not_set', label: 'is not set', needsValue: false },
    ],
  },
  {
    value: 'priority_tier',
    label: 'Priority',
    operators: [
      { value: 'equals', label: 'is', needsValue: true },
      { value: 'in', label: 'is one of', needsValue: true },
      { value: 'is_set', label: 'is set', needsValue: false },
      { value: 'is_not_set', label: 'is not set', needsValue: false },
    ],
  },
  {
    value: 'completed',
    label: 'Status',
    operators: [
      { value: 'equals', label: 'is', needsValue: true },
    ],
  },
  {
    value: 'tags',
    label: 'Tags',
    operators: [
      { value: 'in', label: 'includes', needsValue: true },
    ],
  },
  {
    value: 'energy_required',
    label: 'Energy',
    operators: [
      { value: 'equals', label: 'is', needsValue: true },
      { value: 'in', label: 'is one of', needsValue: true },
    ],
  },
  {
    value: 'list_id',
    label: 'List',
    operators: [
      { value: 'in', label: 'is one of', needsValue: true },
    ],
  },
  {
    value: 'estimated_minutes',
    label: 'Duration',
    operators: [
      { value: 'lte', label: 'at most', needsValue: true },
      { value: 'gte', label: 'at least', needsValue: true },
      { value: 'is_set', label: 'is set', needsValue: false },
      { value: 'is_not_set', label: 'is not set', needsValue: false },
    ],
  },
];

function getIconComponent(iconName: string) {
  return ICON_OPTIONS.find((o) => o.value === iconName)?.icon ?? Filter;
}

// ============================================================================
// FilterRuleRow
// ============================================================================

interface FilterRuleRowProps {
  rule: SmartFilterRule;
  onChange: (rule: SmartFilterRule) => void;
  onRemove: () => void;
  tags: TagType[];
  lists: ListWithCount[];
}

function FilterRuleRow({ rule, onChange, onRemove, tags, lists }: FilterRuleRowProps) {
  const fieldDef = FIELD_OPTIONS.find((f) => f.value === rule.field);
  const operatorDef = fieldDef?.operators.find((o) => o.value === rule.operator);

  const handleFieldChange = (field: SmartFilterField) => {
    const newFieldDef = FIELD_OPTIONS.find((f) => f.value === field)!;
    const firstOp = newFieldDef.operators[0];
    onChange({ field, operator: firstOp.value, value: firstOp.needsValue ? undefined : undefined });
  };

  const handleOperatorChange = (operator: SmartFilterOperator) => {
    const opDef = fieldDef?.operators.find((o) => o.value === operator);
    onChange({ ...rule, operator, value: opDef?.needsValue ? rule.value : undefined });
  };

  const renderValueInput = () => {
    if (!operatorDef?.needsValue) return null;

    switch (rule.field) {
      case 'priority_tier':
        if (rule.operator === 'equals') {
          return (
            <select
              value={String(rule.value ?? '')}
              onChange={(e) => onChange({ ...rule, value: Number(e.target.value) })}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Select...</option>
              <option value="1">Tier 1 (Do Now)</option>
              <option value="2">Tier 2 (Do Soon)</option>
              <option value="3">Tier 3 (Backlog)</option>
            </select>
          );
        }
        if (rule.operator === 'in') {
          const selected = (Array.isArray(rule.value) ? rule.value : []) as string[];
          return (
            <div className="flex gap-1">
              {[
                { v: '1', l: 'T1' },
                { v: '2', l: 'T2' },
                { v: '3', l: 'T3' },
              ].map((tier) => (
                <button
                  key={tier.v}
                  onClick={() => {
                    const newVal = selected.includes(tier.v)
                      ? selected.filter((s) => s !== tier.v)
                      : [...selected, tier.v];
                    onChange({ ...rule, value: newVal });
                  }}
                  className={cn(
                    'px-2 py-1 text-xs rounded border transition-colors',
                    selected.includes(tier.v)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  {tier.l}
                </button>
              ))}
            </div>
          );
        }
        return null;

      case 'completed':
        return (
          <select
            value={rule.value === true ? 'true' : rule.value === false ? 'false' : ''}
            onChange={(e) => onChange({ ...rule, value: e.target.value === 'true' })}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="false">Incomplete</option>
            <option value="true">Completed</option>
          </select>
        );

      case 'tags': {
        const selectedTags = (Array.isArray(rule.value) ? rule.value : []) as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  const newVal = selectedTags.includes(tag.id)
                    ? selectedTags.filter((id) => id !== tag.id)
                    : [...selectedTags, tag.id];
                  onChange({ ...rule, value: newVal });
                }}
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full border transition-colors',
                  selectedTags.includes(tag.id)
                    ? 'border-transparent text-white'
                    : 'border-border hover:bg-accent'
                )}
                style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : undefined}
              >
                {tag.name}
              </button>
            ))}
            {tags.length === 0 && (
              <span className="text-xs text-muted-foreground">No tags created</span>
            )}
          </div>
        );
      }

      case 'energy_required':
        if (rule.operator === 'equals') {
          return (
            <select
              value={String(rule.value ?? '')}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Select...</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          );
        }
        if (rule.operator === 'in') {
          const selected = (Array.isArray(rule.value) ? rule.value : []) as string[];
          return (
            <div className="flex gap-1">
              {['low', 'medium', 'high'].map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    const newVal = selected.includes(level)
                      ? selected.filter((s) => s !== level)
                      : [...selected, level];
                    onChange({ ...rule, value: newVal });
                  }}
                  className={cn(
                    'px-2 py-1 text-xs rounded border transition-colors capitalize',
                    selected.includes(level)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          );
        }
        return null;

      case 'list_id': {
        const selectedLists = (Array.isArray(rule.value) ? rule.value : []) as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => {
                  const newVal = selectedLists.includes(list.id)
                    ? selectedLists.filter((id) => id !== list.id)
                    : [...selectedLists, list.id];
                  onChange({ ...rule, value: newVal });
                }}
                className={cn(
                  'px-2 py-0.5 text-xs rounded border transition-colors flex items-center gap-1',
                  selectedLists.includes(list.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-accent'
                )}
              >
                <div
                  className="h-2 w-2 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: list.color }}
                />
                {list.name}
              </button>
            ))}
          </div>
        );
      }

      case 'estimated_minutes':
        return (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              value={typeof rule.value === 'number' ? rule.value : ''}
              onChange={(e) => onChange({ ...rule, value: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="minutes"
              className="h-8 w-24 text-sm"
            />
            <span className="text-xs text-muted-foreground">min</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-start gap-2 p-2 rounded-md border border-border bg-secondary/30">
      {/* Field */}
      <select
        value={rule.field}
        onChange={(e) => handleFieldChange(e.target.value as SmartFilterField)}
        className="h-8 rounded-md border border-border bg-background px-2 text-sm flex-shrink-0"
      >
        {FIELD_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={rule.operator}
        onChange={(e) => handleOperatorChange(e.target.value as SmartFilterOperator)}
        className="h-8 rounded-md border border-border bg-background px-2 text-sm flex-shrink-0"
      >
        {fieldDef?.operators.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Value */}
      <div className="flex-1 min-w-0">
        {renderValueInput()}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================================================
// SmartListEditor
// ============================================================================

interface SmartListEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingList?: List | null;
  onSaved?: () => void;
}

export function SmartListEditor({ open, onOpenChange, editingList, onSaved }: SmartListEditorProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingList;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('filter');
  const [color, setColor] = useState('#6366f1');
  const [rules, setRules] = useState<SmartFilterRule[]>([]);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Load data for pickers
  const { data: tags = [] } = useQuery<TagType[]>({
    queryKey: ['tags'],
    queryFn: () => window.electronAPI.tags.getAll(),
  });

  const { data: lists = [] } = useQuery<ListWithCount[]>({
    queryKey: ['lists'],
    queryFn: () => window.electronAPI.lists.getAll(),
  });

  // Initialize state when editing
  useEffect(() => {
    if (open) {
      if (editingList) {
        setName(editingList.name);
        setIcon(editingList.icon || 'filter');
        setColor(editingList.color || '#6366f1');
        if (editingList.smart_filter) {
          try {
            const filter = JSON.parse(editingList.smart_filter) as SmartFilterCriteria;
            setRules(filter.rules);
          } catch {
            setRules([]);
          }
        } else {
          setRules([]);
        }
      } else {
        setName('');
        setIcon('filter');
        setColor('#6366f1');
        setRules([]);
      }
    }
  }, [open, editingList]);

  const createMutation = useMutation({
    mutationFn: () =>
      window.electronAPI.smartLists.create({
        name,
        icon,
        color,
        filter: { rules },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartLists'] });
      onOpenChange(false);
      onSaved?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      window.electronAPI.smartLists.update(editingList!.id, {
        name,
        icon,
        color,
        filter: { rules },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartLists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onOpenChange(false);
      onSaved?.();
    },
  });

  const handleSave = () => {
    if (!name.trim() || rules.length === 0) return;
    if (isEditing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleAddRule = () => {
    setRules([...rules, { field: 'due_date', operator: 'today' }]);
  };

  const handleUpdateRule = (index: number, rule: SmartFilterRule) => {
    const newRules = [...rules];
    newRules[index] = rule;
    setRules(newRules);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const IconComp = getIconComponent(icon);
  const canSave = name.trim().length > 0 && rules.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Filter' : 'Create Filter'}</DialogTitle>
          <DialogDescription>
            Create a smart list that automatically shows tasks matching your criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High Priority This Week"
              className="h-9"
            />
          </div>

          {/* Icon & Color */}
          <div className="flex gap-4">
            <div className="relative">
              <label className="text-sm font-medium mb-1 block">Icon</label>
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors"
                style={{ color }}
              >
                <IconComp className="h-4 w-4" />
              </button>
              {showIconPicker && (
                <div className="absolute top-full mt-1 left-0 z-50 bg-background border border-border rounded-md shadow-lg p-2 grid grid-cols-5 gap-1">
                  {ICON_OPTIONS.map((opt) => {
                    const Ic = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setIcon(opt.value);
                          setShowIconPicker(false);
                        }}
                        className={cn(
                          'h-8 w-8 rounded flex items-center justify-center transition-colors',
                          icon === opt.value ? 'bg-accent' : 'hover:bg-accent/50'
                        )}
                      >
                        <Ic className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Color</label>
              <div className="flex gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-7 w-7 rounded-full transition-all',
                      color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Rules */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Show tasks where <span className="text-muted-foreground">all</span> match:
            </label>
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <FilterRuleRow
                  key={index}
                  rule={rule}
                  onChange={(r) => handleUpdateRule(index, r)}
                  onRemove={() => handleRemoveRule(index)}
                  tags={tags}
                  lists={lists}
                />
              ))}
            </div>
            <button
              onClick={handleAddRule}
              className="flex items-center gap-1 mt-2 px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent/50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Rule
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
