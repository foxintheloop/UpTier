import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Clock, Target, Zap, Gem, AlertCircle, MessageSquare, Hash, Sparkles, CalendarPlus, ListPlus, Loader2, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { TagPicker } from './TagPicker';
import { TagBadge } from './TagBadge';
import { cn } from '@/lib/utils';
import { PRIORITY_SCALES, PRIORITY_TIERS } from '@uptier/shared';
import { format, parseISO } from 'date-fns';
export function TaskDetail({ task, onClose, onUpdate }) {
    const [title, setTitle] = useState(task.title);
    const [notes, setNotes] = useState(task.notes || '');
    const [showDueDateSuggestion, setShowDueDateSuggestion] = useState(false);
    const [showBreakdownSuggestion, setShowBreakdownSuggestion] = useState(false);
    const [dueDateSuggestion, setDueDateSuggestion] = useState(null);
    const [breakdownSuggestion, setBreakdownSuggestion] = useState(null);
    const [loadingDueDate, setLoadingDueDate] = useState(false);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);
    const queryClient = useQueryClient();
    useEffect(() => {
        setTitle(task.title);
        setNotes(task.notes || '');
        // Reset suggestions when task changes
        setShowDueDateSuggestion(false);
        setShowBreakdownSuggestion(false);
        setDueDateSuggestion(null);
        setBreakdownSuggestion(null);
    }, [task.id, task.title, task.notes]);
    const updateMutation = useMutation({
        mutationFn: (input) => window.electronAPI.tasks.update(task.id, input),
        onSuccess: (updated) => {
            if (updated) {
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                onUpdate({ ...task, ...updated });
            }
        },
    });
    const handleTitleBlur = () => {
        if (title !== task.title && title.trim()) {
            updateMutation.mutate({ title: title.trim() });
        }
    };
    const handleNotesBlur = () => {
        if (notes !== (task.notes || '')) {
            updateMutation.mutate({ notes: notes || null });
        }
    };
    const handleTagsChange = () => {
        // Invalidate tasks query to refresh task data with updated tags
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };
    const handleGetDueDateSuggestion = async () => {
        setLoadingDueDate(true);
        setShowDueDateSuggestion(true);
        try {
            const suggestion = await window.electronAPI.suggestions.getDueDate(task.id);
            setDueDateSuggestion(suggestion);
        }
        finally {
            setLoadingDueDate(false);
        }
    };
    const handleApplyDueDateSuggestion = async () => {
        if (dueDateSuggestion) {
            await updateMutation.mutateAsync({ due_date: dueDateSuggestion.suggestedDate });
            setShowDueDateSuggestion(false);
            setDueDateSuggestion(null);
        }
    };
    const handleGetBreakdownSuggestion = async () => {
        setLoadingBreakdown(true);
        setShowBreakdownSuggestion(true);
        try {
            const suggestion = await window.electronAPI.suggestions.getBreakdown(task.id);
            setBreakdownSuggestion(suggestion);
        }
        finally {
            setLoadingBreakdown(false);
        }
    };
    const handleApplyBreakdownSuggestion = async () => {
        if (breakdownSuggestion) {
            // Add subtasks
            for (const subtask of breakdownSuggestion.subtasks) {
                await window.electronAPI.subtasks.add(task.id, subtask.title);
            }
            // Update estimated minutes
            await updateMutation.mutateAsync({ estimated_minutes: breakdownSuggestion.totalEstimatedMinutes });
            queryClient.invalidateQueries({ queryKey: ['subtasks', task.id] });
            setShowBreakdownSuggestion(false);
            setBreakdownSuggestion(null);
        }
    };
    const tierInfo = task.priority_tier ? PRIORITY_TIERS[task.priority_tier] : null;
    return (<div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium">Task Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4"/>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur} className="text-lg font-medium border-0 px-0 focus-visible:ring-0" placeholder="Task title"/>
          </div>

          {/* Priority Section */}
          {task.priority_tier && (<div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4"/>
                Priority
              </div>
              <div className={cn('p-3 rounded-md border', task.priority_tier === 1 && 'border-red-500/30 bg-red-500/5', task.priority_tier === 2 && 'border-amber-500/30 bg-amber-500/5', task.priority_tier === 3 && 'border-gray-500/30 bg-gray-500/5')}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={task.priority_tier === 1
                ? 'tier1'
                : task.priority_tier === 2
                    ? 'tier2'
                    : 'tier3'}>
                    Tier {task.priority_tier} — {tierInfo?.label}
                  </Badge>
                </div>
                {task.priority_reasoning && (<p className="text-sm text-muted-foreground">{task.priority_reasoning}</p>)}
              </div>
            </div>)}

          {/* Scores */}
          {(task.effort_score || task.impact_score || task.urgency_score || task.importance_score) && (<div className="space-y-2">
              <div className="text-sm font-medium">Scores</div>
              <div className="grid grid-cols-2 gap-2">
                {task.effort_score && (<ScoreItem icon={Zap} label="Effort" value={task.effort_score} description={PRIORITY_SCALES.effort[task.effort_score]?.label}/>)}
                {task.impact_score && (<ScoreItem icon={Gem} label="Impact" value={task.impact_score} description={PRIORITY_SCALES.impact[task.impact_score]?.label}/>)}
                {task.urgency_score && (<ScoreItem icon={AlertCircle} label="Urgency" value={task.urgency_score} description={PRIORITY_SCALES.urgency[task.urgency_score]?.label}/>)}
                {task.importance_score && (<ScoreItem icon={Target} label="Importance" value={task.importance_score} description={PRIORITY_SCALES.importance[task.importance_score]?.label}/>)}
              </div>
            </div>)}

          {/* Due Date */}
          {task.due_date && (<div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground"/>
              <span>Due {format(parseISO(task.due_date), 'MMMM d, yyyy')}</span>
              {task.due_time && <span>at {task.due_time}</span>}
            </div>)}

          {/* Estimated Time */}
          {task.estimated_minutes && (<div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground"/>
              <span>
                Estimated:{' '}
                {task.estimated_minutes >= 60
                ? `${Math.floor(task.estimated_minutes / 60)}h ${task.estimated_minutes % 60}m`
                : `${task.estimated_minutes}m`}
              </span>
            </div>)}

          {/* Goals */}
          {task.goals.length > 0 && (<div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4"/>
                Linked Goals
              </div>
              <div className="space-y-1">
                {task.goals.map((goal) => (<div key={goal.goal_id} className="flex items-center justify-between text-sm p-2 rounded-md bg-secondary/30">
                    <span>{goal.goal_name}</span>
                    <span className="text-xs text-muted-foreground">
                      Strength: {goal.alignment_strength}/5
                    </span>
                  </div>))}
              </div>
            </div>)}

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Hash className="h-4 w-4"/>
              Tags
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {task.tags && task.tags.length > 0 && (<>
                  {task.tags.map((tag) => (<TagBadge key={tag.id} tag={tag}/>))}
                </>)}
              <TagPicker taskId={task.id} selectedTags={task.tags || []} onTagsChange={handleTagsChange}/>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4"/>
              Notes
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={handleNotesBlur} placeholder="Add notes..." className="w-full min-h-[100px] p-3 text-sm bg-secondary/30 rounded-md border-0 resize-none focus:outline-none focus:ring-1 focus:ring-primary"/>
          </div>

          {/* AI Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary"/>
              Smart Suggestions
            </div>

            <div className="space-y-2">
              {/* Due Date Suggestion */}
              {!showDueDateSuggestion ? (<Button variant="outline" size="sm" onClick={handleGetDueDateSuggestion} disabled={!!task.due_date} className="w-full justify-start gap-2">
                  <CalendarPlus className="h-4 w-4"/>
                  {task.due_date ? 'Due date already set' : 'Suggest Due Date'}
                </Button>) : (<div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarPlus className="h-4 w-4"/>
                    Due Date Suggestion
                  </div>
                  {loadingDueDate ? (<div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin"/>
                      Analyzing task patterns...
                    </div>) : dueDateSuggestion ? (<>
                      <div className="text-sm">
                        <span className="font-medium">Suggested: </span>
                        {format(parseISO(dueDateSuggestion.suggestedDate), 'MMMM d, yyyy')}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({Math.round(dueDateSuggestion.confidence * 100)}% confidence)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{dueDateSuggestion.reasoning}</p>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={handleApplyDueDateSuggestion} className="flex-1 gap-1">
                          <Check className="h-3 w-3"/>
                          Apply
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                    setShowDueDateSuggestion(false);
                    setDueDateSuggestion(null);
                }} className="flex-1">
                          Dismiss
                        </Button>
                      </div>
                    </>) : (<p className="text-sm text-muted-foreground">No suggestion available.</p>)}
                </div>)}

              {/* Breakdown Suggestion */}
              {!showBreakdownSuggestion ? (<Button variant="outline" size="sm" onClick={handleGetBreakdownSuggestion} className="w-full justify-start gap-2">
                  <ListPlus className="h-4 w-4"/>
                  Suggest Task Breakdown
                </Button>) : (<div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ListPlus className="h-4 w-4"/>
                    Task Breakdown Suggestion
                  </div>
                  {loadingBreakdown ? (<div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin"/>
                      Analyzing task complexity...
                    </div>) : breakdownSuggestion ? (<>
                      <div className="space-y-1">
                        {breakdownSuggestion.subtasks.map((subtask, i) => (<div key={i} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary"/>
                              {subtask.title}
                            </span>
                            {subtask.estimatedMinutes && (<span className="text-xs text-muted-foreground">
                                ~{subtask.estimatedMinutes}m
                              </span>)}
                          </div>))}
                      </div>
                      <div className="text-xs text-muted-foreground pt-1">
                        Total: ~{breakdownSuggestion.totalEstimatedMinutes}m
                      </div>
                      <p className="text-xs text-muted-foreground">{breakdownSuggestion.reasoning}</p>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={handleApplyBreakdownSuggestion} className="flex-1 gap-1">
                          <Check className="h-3 w-3"/>
                          Add Subtasks
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                    setShowBreakdownSuggestion(false);
                    setBreakdownSuggestion(null);
                }} className="flex-1">
                          Dismiss
                        </Button>
                      </div>
                    </>) : (<p className="text-sm text-muted-foreground">No breakdown suggested for this task.</p>)}
                </div>)}
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
            <p>Created: {format(parseISO(task.created_at), 'PPp')}</p>
            <p>Updated: {format(parseISO(task.updated_at), 'PPp')}</p>
            {task.prioritized_at && (<p>Last prioritized: {format(parseISO(task.prioritized_at), 'PPp')}</p>)}
          </div>
        </div>
      </ScrollArea>
    </div>);
}
function ScoreItem({ icon: Icon, label, value, description }) {
    return (<div className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground"/>
      <div>
        <div className="flex items-center gap-1">
          <span className="font-medium">{label}:</span>
          <span>{value}/5</span>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>);
}
//# sourceMappingURL=TaskDetail.js.map