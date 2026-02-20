import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sunrise,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Minus,
  CalendarCheck,
  Rocket,
  X,
  AlertCircle,
  ChevronDown,
  CalendarDays,
  Check,
  Save,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format, subDays, addDays, parseISO, getDay, isBefore, startOfDay } from 'date-fns';
import type { TaskWithGoals } from '@uptier/shared';

type PlanningMode = 'single' | 'week';

interface DailyPlanningProps {
  onClose: () => void;
  onComplete: () => void;
  initialDate?: string;
  initialMode?: PlanningMode;
}

type PlanningStep = 'review' | 'build' | 'schedule' | 'confirm';

const STEPS: PlanningStep[] = ['review', 'build', 'schedule', 'confirm'];

function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function getStepLabels(targetDate: string): Record<PlanningStep, string> {
  const target = parseISO(targetDate);
  const previous = subDays(target, 1);
  const todayStr = getTodayStr();

  const previousLabel = format(previous, 'yyyy-MM-dd') === todayStr
    ? 'Today'
    : format(previous, 'EEEE');
  const targetLabel = targetDate === todayStr ? "Today" : format(target, 'EEEE');

  return {
    review: `Review ${previousLabel}`,
    build: `Build ${targetLabel}'s List`,
    schedule: 'Schedule',
    confirm: 'Confirm',
  };
}

export function DailyPlanning({ onClose, onComplete, initialDate, initialMode }: DailyPlanningProps) {
  const [step, setStep] = useState<PlanningStep>('review');
  const [todayTaskIds, setTodayTaskIds] = useState<Set<string>>(new Set());
  const [scheduledTasks, setScheduledTasks] = useState<Map<string, string>>(new Map());
  const queryClient = useQueryClient();

  // Date and mode state
  const [targetDate, setTargetDate] = useState<string>(initialDate || getTodayStr());
  const [planningMode, setPlanningMode] = useState<PlanningMode>(initialMode || 'single');
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [weekDayIndex, setWeekDayIndex] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [completedWeekDays, setCompletedWeekDays] = useState<Set<string>>(new Set());

  const isTargetToday = targetDate === getTodayStr();
  const targetDateObj = parseISO(targetDate);
  const stepLabels = getStepLabels(targetDate);

  // Step 1 data
  const { data: previousDaySummary } = useQuery({
    queryKey: ['planning', 'previousDay', targetDate],
    queryFn: () => window.electronAPI.planning.getPreviousDaySummary(targetDate),
  });

  // Step 2 data
  const { data: availableTasks = [] } = useQuery<TaskWithGoals[]>({
    queryKey: ['planning', 'available', targetDate],
    queryFn: () => window.electronAPI.planning.getAvailableTasks(targetDate),
  });

  // Step 2/3 data
  const { data: dayOverview } = useQuery({
    queryKey: ['planning', 'dayOverview', targetDate],
    queryFn: () => window.electronAPI.planning.getDayOverview(targetDate),
  });

  // Settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.settings.get(),
  });

  const workingHours = (settings as { planning?: { workingHoursPerDay?: number } })?.planning?.workingHoursPerDay ?? 8;

  // Combined effect: reset on targetDate change, initialize from dayOverview
  const prevTargetDate = useRef(targetDate);

  useEffect(() => {
    // If targetDate changed, reset state and wait for new dayOverview
    if (prevTargetDate.current !== targetDate) {
      prevTargetDate.current = targetDate;
      setStep('review');
      setTodayTaskIds(new Set());
      setScheduledTasks(new Map());
      return;
    }

    // Initialize from dayOverview when it arrives
    if (dayOverview) {
      const ids = new Set<string>();
      const times = new Map<string, string>();
      for (const t of [...dayOverview.scheduled, ...dayOverview.unscheduled]) {
        ids.add(t.id);
        if (t.due_time) {
          times.set(t.id, t.due_time);
        }
      }
      setTodayTaskIds(ids);
      setScheduledTasks(times);
    }
  }, [targetDate, dayOverview]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        handleNext();
      } else if (e.key === 'Backspace' && !isInputFocused()) {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const isInputFocused = () => {
    const el = document.activeElement;
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
  };

  const stepIndex = STEPS.indexOf(step);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1]);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1]);
    }
  };

  // Step 1 actions
  const handleReschedule = async (taskId: string) => {
    await window.electronAPI.tasks.update(taskId, { due_date: targetDate });
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleDefer = async (taskId: string) => {
    await window.electronAPI.tasks.update(taskId, { due_date: null });
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleDrop = async (taskId: string) => {
    await window.electronAPI.tasks.complete(taskId);
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Step 2 actions
  const addToDay = async (task: TaskWithGoals) => {
    if (todayTaskIds.has(task.id)) return;
    await window.electronAPI.tasks.update(task.id, { due_date: targetDate });
    setTodayTaskIds((prev) => new Set(prev).add(task.id));
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const removeFromDay = async (task: TaskWithGoals) => {
    await window.electronAPI.tasks.update(task.id, { due_date: null });
    setTodayTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Step 3 actions
  const handleScheduleTime = async (taskId: string, time: string) => {
    await window.electronAPI.tasks.update(taskId, { due_date: targetDate, due_time: time });
    setScheduledTasks((prev) => new Map(prev).set(taskId, time));
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Merge availableTasks and dayOverview so tasks already on the day always appear
  const allKnownTasks = useMemo(() => {
    const taskMap = new Map<string, TaskWithGoals>();
    for (const t of availableTasks) taskMap.set(t.id, t);
    if (dayOverview) {
      for (const t of [...dayOverview.scheduled, ...dayOverview.unscheduled]) {
        if (!taskMap.has(t.id)) taskMap.set(t.id, t);
      }
    }
    return Array.from(taskMap.values());
  }, [availableTasks, dayOverview]);

  const dayTasks = useMemo(() => {
    return allKnownTasks.filter((t) => todayTaskIds.has(t.id));
  }, [allKnownTasks, todayTaskIds]);

  const totalPlannedMinutes = useMemo(() => {
    return dayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  }, [dayTasks]);

  const capacityPercent = Math.min(100, (totalPlannedMinutes / (workingHours * 60)) * 100);

  // Finish planning
  const handleFinish = async () => {
    // Record this date as planned
    await window.electronAPI.planning.addPlannedDate(targetDate);

    // In week mode, advance to next day
    if (planningMode === 'week' && weekDayIndex < weekDays.length - 1) {
      setCompletedWeekDays((prev) => new Set(prev).add(targetDate));
      const nextIndex = weekDayIndex + 1;
      setWeekDayIndex(nextIndex);
      setTargetDate(weekDays[nextIndex]);
      return; // Don't close yet — targetDate change triggers state reset via useEffect
    }

    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    onComplete();
  };

  // Date picker handlers
  const handleSelectDate = (date: string) => {
    setPlanningMode('single');
    setWeekDays([]);
    setWeekDayIndex(0);
    setCompletedWeekDays(new Set());
    setTargetDate(date);
    setDatePickerOpen(false);
  };

  const handleSelectWeek = (dates: string[]) => {
    setPlanningMode('week');
    setWeekDays(dates);
    setWeekDayIndex(0);
    setCompletedWeekDays(new Set());
    setTargetDate(dates[0]);
    setDatePickerOpen(false);
  };

  const handleWeekTabClick = (dayIndex: number) => {
    setWeekDayIndex(dayIndex);
    setTargetDate(weekDays[dayIndex]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Sunrise className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">
            {isTargetToday ? 'Plan My Day' : `Plan ${format(targetDateObj, 'EEEE')}`}
          </h1>

          {/* Date picker */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent/50 transition-colors">
                <CalendarIcon className="h-4 w-4" />
                {format(targetDateObj, 'EEEE, MMMM d')}
                <ChevronDown className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <PlanningDatePicker
                selectedDate={targetDate}
                onSelectDate={handleSelectDate}
                onSelectWeek={handleSelectWeek}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Week mode day tabs */}
      {planningMode === 'week' && weekDays.length > 0 && (
        <div className="flex items-center justify-center gap-1 py-3 border-b border-border px-8">
          <span className="text-xs text-muted-foreground mr-3">
            Day {weekDayIndex + 1} of {weekDays.length}
          </span>
          {weekDays.map((day, i) => (
            <button
              key={day}
              onClick={() => handleWeekTabClick(i)}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1',
                i === weekDayIndex
                  ? 'bg-primary text-primary-foreground'
                  : completedWeekDays.has(day)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground hover:bg-accent'
              )}
            >
              {completedWeekDays.has(day) && <Check className="h-3 w-3" />}
              {format(parseISO(day), 'EEE d')}
            </button>
          ))}
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : i < stepIndex
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
              )}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium border border-current">
                {i < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{stepLabels[s]}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('w-8 h-0.5', i < stepIndex ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-8">
        <ScrollArea className="h-full">
          <div className="max-w-3xl mx-auto py-6">
            {step === 'review' && (
              <ReviewStep
                completed={previousDaySummary?.completed ?? []}
                incomplete={previousDaySummary?.incomplete ?? []}
                onReschedule={handleReschedule}
                onDefer={handleDefer}
                onDrop={handleDrop}
                targetDate={targetDate}
                stepLabel={stepLabels.review}
              />
            )}
            {step === 'build' && (
              <BuildStep
                availableTasks={allKnownTasks}
                todayTaskIds={todayTaskIds}
                onAddToToday={addToDay}
                onRemoveFromToday={removeFromDay}
                totalMinutes={totalPlannedMinutes}
                capacityPercent={capacityPercent}
                workingHours={workingHours}
                targetDate={targetDate}
                stepLabel={stepLabels.build}
              />
            )}
            {step === 'schedule' && (
              <ScheduleStep
                todayTasks={dayTasks}
                scheduledTasks={scheduledTasks}
                onScheduleTime={handleScheduleTime}
                totalMinutes={totalPlannedMinutes}
                workingHours={workingHours}
                targetDate={targetDate}
              />
            )}
            {step === 'confirm' && (
              <ConfirmStep
                taskCount={dayTasks.length}
                totalMinutes={totalPlannedMinutes}
                workingHours={workingHours}
                scheduledCount={scheduledTasks.size}
                isTargetToday={isTargetToday}
                targetDate={targetDate}
                isWeekMode={planningMode === 'week'}
                isLastWeekDay={planningMode === 'week' && weekDayIndex === weekDays.length - 1}
              />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={stepIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="gap-2"
        >
          {stepIndex === STEPS.length - 1 ? (
            <>
              {isTargetToday ? (
                <><Rocket className="h-4 w-4" />Start My Day</>
              ) : planningMode === 'week' && weekDayIndex < weekDays.length - 1 ? (
                <><ArrowRight className="h-4 w-4" />Next Day</>
              ) : (
                <><Save className="h-4 w-4" />Save Plan</>
              )}
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Date Picker
// ============================================================================

function PlanningDatePicker({
  selectedDate,
  onSelectDate,
  onSelectWeek,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSelectWeek: (dates: string[]) => void;
}) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

  // Compute next Monday
  const dayOfWeek = getDay(today); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  const nextMonday = addDays(today, daysUntilMonday);
  const nextMondayStr = format(nextMonday, 'yyyy-MM-dd');

  // This week's remaining weekdays (if it's Mon-Thu)
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4; // Mon-Thu
  const thisWeekDates = isWeekday
    ? Array.from({ length: 5 - dayOfWeek }, (_, i) => format(addDays(today, i + 1), 'yyyy-MM-dd'))
    : null;

  // Next week Mon-Fri
  const nextWeekDates = Array.from({ length: 5 }, (_, i) =>
    format(addDays(nextMonday, i), 'yyyy-MM-dd')
  );

  const presetClass = 'w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors';
  const activePresetClass = 'bg-primary/10 text-primary';

  return (
    <div className="flex">
      <div className="border-r border-border p-2 space-y-0.5 min-w-[160px]">
        <button
          onClick={() => onSelectDate(todayStr)}
          className={cn(presetClass, selectedDate === todayStr && activePresetClass)}
        >
          Today
        </button>
        <button
          onClick={() => onSelectDate(tomorrowStr)}
          className={cn(presetClass, selectedDate === tomorrowStr && activePresetClass)}
        >
          Tomorrow
        </button>
        <button
          onClick={() => onSelectDate(nextMondayStr)}
          className={cn(presetClass, selectedDate === nextMondayStr && activePresetClass)}
        >
          Next Monday
        </button>
        <div className="border-t border-border my-1.5" />
        {thisWeekDates && thisWeekDates.length > 1 && (
          <button
            onClick={() => onSelectWeek(thisWeekDates)}
            className={cn(presetClass, 'flex items-center gap-1.5')}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Rest of This Week</span>
          </button>
        )}
        <button
          onClick={() => onSelectWeek(nextWeekDates)}
          className={cn(presetClass, 'flex items-center gap-1.5')}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Next Week</span>
        </button>
      </div>
      <div className="p-2">
        <Calendar
          mode="single"
          selected={parseISO(selectedDate)}
          onSelect={(date) => date && onSelectDate(format(date, 'yyyy-MM-dd'))}
          disabled={(date) => isBefore(date, startOfDay(today))}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Step 1: Review Previous Day
// ============================================================================

function ReviewStep({
  completed,
  incomplete,
  onReschedule,
  onDefer,
  onDrop,
  targetDate,
  stepLabel,
}: {
  completed: TaskWithGoals[];
  incomplete: TaskWithGoals[];
  onReschedule: (id: string) => void;
  onDefer: (id: string) => void;
  onDrop: (id: string) => void;
  targetDate: string;
  stepLabel: string;
}) {
  const targetDateObj = parseISO(targetDate);
  const isTargetToday = targetDate === getTodayStr();
  const rescheduleLabel = isTargetToday ? 'Today' : format(targetDateObj, 'EEE');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">{stepLabel}</h2>
        <p className="text-muted-foreground">
          Let's see how {format(subDays(targetDateObj, 1), 'EEEE')} went
        </p>
      </div>

      {/* Completed celebration */}
      {completed.length > 0 && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span className="font-medium text-green-400">
              {completed.length} task{completed.length !== 1 ? 's' : ''} completed!
            </span>
          </div>
          <div className="space-y-1.5">
            {completed.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span className="line-through">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length === 0 && incomplete.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tasks to review.</p>
          <p className="text-sm mt-1">Let's plan a productive day!</p>
        </div>
      )}

      {/* Incomplete tasks */}
      {incomplete.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Incomplete ({incomplete.length})
          </h3>
          <div className="space-y-2">
            {incomplete.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-md border border-border bg-card"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm font-medium truncate">{task.title}</div>
                  {task.estimated_minutes && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      {task.estimated_minutes}m
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReschedule(task.id)}
                    className="h-7 text-xs"
                  >
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {rescheduleLabel}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDefer(task.id)}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Defer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDrop(task.id)}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Drop
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 2: Build Day's List
// ============================================================================

function BuildStep({
  availableTasks,
  todayTaskIds,
  onAddToToday,
  onRemoveFromToday,
  totalMinutes,
  capacityPercent,
  workingHours,
  targetDate,
  stepLabel,
}: {
  availableTasks: TaskWithGoals[];
  todayTaskIds: Set<string>;
  onAddToToday: (task: TaskWithGoals) => void;
  onRemoveFromToday: (task: TaskWithGoals) => void;
  totalMinutes: number;
  capacityPercent: number;
  workingHours: number;
  targetDate: string;
  stepLabel: string;
}) {
  const isTargetToday = targetDate === getTodayStr();
  const dayLabel = isTargetToday ? 'Today' : format(parseISO(targetDate), 'EEEE');
  const notSelectedTasks = availableTasks.filter((t) => !todayTaskIds.has(t.id));
  const selectedTasks = availableTasks.filter((t) => todayTaskIds.has(t.id));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">{stepLabel}</h2>
        <p className="text-muted-foreground">Choose which tasks to tackle {isTargetToday ? 'today' : `on ${format(parseISO(targetDate), 'EEEE')}`}</p>
      </div>

      {/* Capacity meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Capacity</span>
          <span className={cn(
            'font-medium',
            capacityPercent > 80 ? 'text-amber-400' : 'text-foreground'
          )}>
            {totalMinutes > 0 ? formatMinutesCompact(totalMinutes) : '0m'} / {workingHours}h
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              capacityPercent > 80 ? 'bg-amber-400' : 'bg-primary'
            )}
            style={{ width: `${Math.min(100, capacityPercent)}%` }}
          />
        </div>
        {capacityPercent > 80 && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="h-3 w-3" />
            You may be over-committing — consider removing some tasks
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Available tasks */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Available ({notSelectedTasks.length})
          </h3>
          <div className="space-y-1.5">
            {notSelectedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">All tasks added</p>
            ) : (
              notSelectedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  action={
                    <button
                      onClick={() => onAddToToday(task)}
                      className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Day's tasks */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {dayLabel} ({selectedTasks.length})
          </h3>
          <div className="space-y-1.5">
            {selectedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Add tasks from the left</p>
            ) : (
              selectedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  action={
                    <button
                      onClick={() => onRemoveFromToday(task)}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Schedule
// ============================================================================

const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const hour = 6 + i;
  return {
    value: `${hour.toString().padStart(2, '0')}:00`,
    label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
  };
});

function ScheduleStep({
  todayTasks,
  scheduledTasks,
  onScheduleTime,
  totalMinutes,
  workingHours,
  targetDate,
}: {
  todayTasks: TaskWithGoals[];
  scheduledTasks: Map<string, string>;
  onScheduleTime: (taskId: string, time: string) => void;
  totalMinutes: number;
  workingHours: number;
  targetDate: string;
}) {
  const isTargetToday = targetDate === getTodayStr();
  const unscheduled = todayTasks.filter((t) => !scheduledTasks.has(t.id));
  const scheduled = todayTasks
    .filter((t) => scheduledTasks.has(t.id))
    .sort((a, b) => (scheduledTasks.get(a.id) || '').localeCompare(scheduledTasks.get(b.id) || ''));

  const estimateFinishTime = () => {
    if (totalMinutes === 0) return null;
    if (isTargetToday) {
      const now = new Date();
      const startHour = Math.max(now.getHours(), 6);
      const finishTime = new Date();
      finishTime.setHours(startHour, now.getMinutes() + totalMinutes, 0, 0);
      return format(finishTime, 'h:mm a');
    }
    // For future dates, estimate based on working hours starting at 9 AM
    const totalHours = totalMinutes / 60;
    const finishHour = 9 + totalHours;
    const h = Math.floor(finishHour);
    const m = Math.round((finishHour - h) * 60);
    const finishTime = new Date();
    finishTime.setHours(h, m, 0, 0);
    return format(finishTime, 'h:mm a');
  };

  const dayLabel = isTargetToday ? 'Your Day' : format(parseISO(targetDate), 'EEEE');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Schedule {dayLabel}</h2>
        <p className="text-muted-foreground">
          {formatMinutesCompact(totalMinutes)} planned / {workingHours}h available
          {estimateFinishTime() && ` — Finish by ${estimateFinishTime()}`}
        </p>
      </div>

      {/* Scheduled tasks */}
      {scheduled.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Scheduled
          </h3>
          <div className="space-y-1.5">
            {scheduled.map((task) => {
              const time = scheduledTasks.get(task.id)!;
              const hour = parseInt(time.split(':')[0]);
              const label = `${hour > 12 ? hour - 12 : hour}:${time.split(':')[1]} ${hour >= 12 ? 'PM' : 'AM'}`;
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-md border border-border bg-card"
                >
                  <span className="text-sm font-medium text-primary w-20">{label}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{task.title}</div>
                    {task.estimated_minutes && (
                      <span className="text-xs text-muted-foreground">{task.estimated_minutes}m</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unscheduled tasks */}
      {unscheduled.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Unscheduled ({unscheduled.length})
          </h3>
          <div className="space-y-2">
            {unscheduled.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-md border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{task.title}</div>
                  {task.estimated_minutes && (
                    <span className="text-xs text-muted-foreground">{task.estimated_minutes}m</span>
                  )}
                </div>
                <select
                  className="text-sm bg-secondary border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onScheduleTime(task.id, e.target.value);
                    }
                  }}
                >
                  <option value="" disabled>
                    Pick time...
                  </option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {todayTasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tasks to schedule.</p>
          <p className="text-sm mt-1">Go back and add some tasks first.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 4: Confirm
// ============================================================================

function ConfirmStep({
  taskCount,
  totalMinutes,
  workingHours,
  scheduledCount,
  isTargetToday,
  targetDate,
  isWeekMode,
  isLastWeekDay,
}: {
  taskCount: number;
  totalMinutes: number;
  workingHours: number;
  scheduledCount: number;
  isTargetToday: boolean;
  targetDate: string;
  isWeekMode: boolean;
  isLastWeekDay: boolean;
}) {
  const estimateFinishTime = () => {
    if (totalMinutes === 0) return null;
    if (isTargetToday) {
      const now = new Date();
      const startHour = Math.max(now.getHours(), 6);
      const finishTime = new Date();
      finishTime.setHours(startHour, now.getMinutes() + totalMinutes, 0, 0);
      return format(finishTime, 'h:mm a');
    }
    const totalHours = totalMinutes / 60;
    const finishHour = 9 + totalHours;
    const h = Math.floor(finishHour);
    const m = Math.round((finishHour - h) * 60);
    const finishTime = new Date();
    finishTime.setHours(h, m, 0, 0);
    return format(finishTime, 'h:mm a');
  };

  const dayLabel = isTargetToday ? 'your day' : format(parseISO(targetDate), 'EEEE');
  const buttonLabel = isTargetToday
    ? 'Start My Day'
    : isWeekMode && !isLastWeekDay
      ? 'Next Day'
      : 'Save Plan';
  const buttonHint = isTargetToday
    ? `Press Enter or click "${buttonLabel}" to begin`
    : isWeekMode && !isLastWeekDay
      ? `Press Enter to continue to the next day`
      : `Press Enter or click "${buttonLabel}" to finish`;

  return (
    <div className="space-y-8 py-8">
      <div className="text-center space-y-2">
        <CalendarCheck className="h-12 w-12 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">
          {isTargetToday ? 'Ready to Go!' : `${format(parseISO(targetDate), 'EEEE')} is Set!`}
        </h2>
        <p className="text-muted-foreground">Here's {dayLabel} at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <SummaryCard label="Tasks" value={`${taskCount}`} />
        <SummaryCard label="Total Time" value={totalMinutes > 0 ? formatMinutesCompact(totalMinutes) : '—'} />
        <SummaryCard label="Scheduled" value={`${scheduledCount}`} />
        <SummaryCard
          label="Finish by"
          value={estimateFinishTime() || '—'}
        />
      </div>

      {totalMinutes > workingHours * 60 && (
        <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
          <AlertCircle className="h-4 w-4" />
          You have more planned than available hours — pace yourself!
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {buttonHint}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function TaskCard({ task, action }: { task: TaskWithGoals; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-md border border-border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{task.title}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {task.priority_tier && (
            <span className={cn(
              task.priority_tier === 1 && 'text-red-400',
              task.priority_tier === 2 && 'text-amber-400',
            )}>
              P{task.priority_tier}
            </span>
          )}
          {task.estimated_minutes && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {task.estimated_minutes}m
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-0.5">
              <CalendarIcon className="h-3 w-3" />
              {format(new Date(task.due_date + 'T00:00'), 'MMM d')}
            </span>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function formatMinutesCompact(mins: number): string {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}
