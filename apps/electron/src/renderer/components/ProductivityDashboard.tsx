import { useQuery } from '@tanstack/react-query';
import { BarChart3, Flame, Clock, CheckCircle2, Target } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DashboardData, TodaySummary, WeeklyTrend, StreakInfo, FocusGoalProgress } from '@uptier/shared';

export function ProductivityDashboard() {
  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => window.electronAPI.analytics.getDashboard(),
    refetchInterval: 60_000,
  });

  if (isLoading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <BarChart3 className="h-5 w-5 text-emerald-500" />
        <h1 className="text-lg font-semibold">Productivity Dashboard</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          {/* Row 1: Today Summary Cards */}
          <TodaySummaryCards summary={dashboard.todaySummary} />

          {/* Row 2: Weekly Trend + Streak */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <WeeklyBarChart trend={dashboard.weeklyTrend} />
            </div>
            <StreakCard streak={dashboard.streak} />
          </div>

          {/* Row 3: Focus Goal + Priority Distribution */}
          <div className="grid grid-cols-2 gap-4">
            <FocusGoalCard focusGoal={dashboard.focusGoal} />
            <PriorityDistribution tiers={dashboard.todaySummary.tierBreakdown} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Today Summary Cards
// ============================================================================

function TodaySummaryCards({ summary }: { summary: TodaySummary }) {
  const cards = [
    {
      label: 'Completed',
      value: summary.completedCount,
      icon: CheckCircle2,
      color: 'text-green-500',
    },
    {
      label: 'Completion Rate',
      value: `${summary.completionRate}%`,
      icon: Target,
      color: summary.completionRate >= 80 ? 'text-green-500' : summary.completionRate >= 50 ? 'text-amber-500' : 'text-muted-foreground',
    },
    {
      label: 'Focus Time',
      value: summary.focusMinutes >= 60
        ? `${Math.floor(summary.focusMinutes / 60)}h ${summary.focusMinutes % 60}m`
        : `${summary.focusMinutes}m`,
      icon: Clock,
      color: 'text-blue-500',
    },
    {
      label: 'Planned',
      value: summary.plannedCount,
      icon: BarChart3,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={cn('h-4 w-4', card.color)} />
            <span className="text-xs text-muted-foreground">{card.label}</span>
          </div>
          <div className="text-2xl font-bold">{card.value}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Weekly Bar Chart
// ============================================================================

function WeeklyBarChart({ trend }: { trend: WeeklyTrend }) {
  const maxCount = Math.max(1, ...trend.days.map((d) => d.completedCount));
  const barWidth = 40;
  const gap = 16;
  const chartHeight = 140;
  const chartWidth = trend.days.length * (barWidth + gap) - gap;
  const labelHeight = 24;
  const topPadding = 20;
  const totalHeight = chartHeight + labelHeight + topPadding;

  return (
    <div className="rounded-lg border border-border bg-card p-4 h-full">
      <h3 className="text-sm font-medium mb-3">Weekly Completions</h3>
      <svg
        width="100%"
        viewBox={`0 0 ${chartWidth} ${totalHeight}`}
        preserveAspectRatio="xMidYEnd meet"
      >
        {trend.days.map((day, i) => {
          const barHeight = maxCount > 0 ? (day.completedCount / maxCount) * chartHeight : 0;
          const x = i * (barWidth + gap);
          const y = topPadding + chartHeight - barHeight;
          const isToday = i === trend.days.length - 1;

          return (
            <g key={day.date}>
              {/* Bar background */}
              <rect
                x={x} y={topPadding} width={barWidth} height={chartHeight}
                rx={4} className="fill-muted/20"
              />
              {/* Bar fill */}
              {barHeight > 0 && (
                <rect
                  x={x} y={y} width={barWidth} height={barHeight}
                  rx={4} className={isToday ? 'fill-primary' : 'fill-primary/60'}
                />
              )}
              {/* Count label */}
              {day.completedCount > 0 && (
                <text
                  x={x + barWidth / 2} y={y - 4} textAnchor="middle"
                  className="fill-muted-foreground" style={{ fontSize: '11px' }}
                >
                  {day.completedCount}
                </text>
              )}
              {/* Day label */}
              <text
                x={x + barWidth / 2} y={topPadding + chartHeight + 16} textAnchor="middle"
                className="fill-muted-foreground" style={{ fontSize: '11px' }}
              >
                {day.dayLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================================
// Streak Card
// ============================================================================

function StreakCard({ streak }: { streak: StreakInfo }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center justify-center text-center h-full">
      <Flame
        className={cn(
          'h-8 w-8 mb-2',
          streak.currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'
        )}
      />
      <div className="text-3xl font-bold">{streak.currentStreak}</div>
      <div className="text-xs text-muted-foreground mt-1">day streak</div>
      {streak.longestStreak > 0 && (
        <div className="text-xs text-muted-foreground mt-3">
          Best: {streak.longestStreak} days
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Focus Goal Card
// ============================================================================

function FocusGoalCard({ focusGoal }: { focusGoal: FocusGoalProgress }) {
  const r = 50;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(focusGoal.progressPercent, 100) / 100) * circumference;
  const hours = Math.floor(focusGoal.todayMinutes / 60);
  const mins = focusGoal.todayMinutes % 60;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium mb-3">Focus Goal</h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor"
              strokeWidth="8" className="text-muted/20" />
            <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor"
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className={cn(
                'transition-all duration-500',
                focusGoal.progressPercent >= 100 ? 'text-green-500' : 'text-primary'
              )}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold">{Math.round(focusGoal.progressPercent)}%</span>
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold">
            {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
          </div>
          <div className="text-xs text-muted-foreground">
            of {focusGoal.dailyGoalMinutes >= 60
              ? `${Math.floor(focusGoal.dailyGoalMinutes / 60)}h`
              : `${focusGoal.dailyGoalMinutes}m`} goal
          </div>
          {focusGoal.dailyGoalMinutes === 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Set a goal in Settings
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Priority Distribution
// ============================================================================

function PriorityDistribution({ tiers }: { tiers: TodaySummary['tierBreakdown'] }) {
  const total = tiers.tier1 + tiers.tier2 + tiers.tier3 + tiers.unset;

  const segments = [
    { label: 'Do Now', count: tiers.tier1, color: 'bg-red-500' },
    { label: 'Do Soon', count: tiers.tier2, color: 'bg-amber-500' },
    { label: 'Backlog', count: tiers.tier3, color: 'bg-blue-500' },
    { label: 'Unset', count: tiers.unset, color: 'bg-muted-foreground/30' },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium mb-3">Priority Distribution</h3>
      {total === 0 ? (
        <div className="text-sm text-muted-foreground">No tasks planned today</div>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="h-4 rounded-full overflow-hidden flex">
            {segments
              .filter((s) => s.count > 0)
              .map((seg) => (
                <div
                  key={seg.label}
                  className={seg.color}
                  style={{ width: `${(seg.count / total) * 100}%` }}
                />
              ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {segments
              .filter((s) => s.count > 0)
              .map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className={cn('h-2.5 w-2.5 rounded-full', seg.color)} />
                  {seg.label} ({seg.count})
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
