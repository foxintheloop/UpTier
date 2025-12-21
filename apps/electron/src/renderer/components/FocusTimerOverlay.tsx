import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Play, Pause, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@uptier/shared';

interface FocusTimerOverlayProps {
  task: Task;
  durationMinutes: number;
  sessionId: string;
  onEnd: (completed: boolean) => void;
}

export function FocusTimerOverlay({
  task,
  durationMinutes,
  sessionId,
  onEnd,
}: FocusTimerOverlayProps) {
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60); // in seconds
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedTimeRef = useRef<number>(0);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = ((durationMinutes * 60 - timeRemaining) / (durationMinutes * 60)) * 100;

  // Handle timer completion
  const handleComplete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onEnd(true);
  }, [onEnd]);

  // Handle manual end (incomplete)
  const handleEndEarly = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onEnd(false);
  }, [onEnd]);

  // Timer tick
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, handleComplete]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleEndEarly();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEndEarly]);

  // SVG circle progress
  const circleRadius = 120;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8 p-8">
        {/* Task Title */}
        <h2 className="text-xl font-medium text-foreground max-w-md text-center truncate">
          {task.title}
        </h2>

        {/* Task Notes */}
        {task.notes && (
          <p className="text-sm text-muted-foreground max-w-md text-center line-clamp-3">
            {task.notes}
          </p>
        )}

        {/* Timer Circle */}
        <div className="relative">
          <svg
            width="280"
            height="280"
            viewBox="0 0 280 280"
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              cx="140"
              cy="140"
              r={circleRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/20"
            />
            {/* Progress circle */}
            <circle
              cx="140"
              cy="140"
              r={circleRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn(
                'transition-all duration-1000',
                isPaused ? 'text-amber-500' : 'text-primary'
              )}
            />
          </svg>

          {/* Timer Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                'text-5xl font-mono font-bold tabular-nums',
                isPaused && 'text-amber-500'
              )}
            >
              {formatTime(timeRemaining)}
            </span>
            {isPaused && (
              <span className="text-sm text-amber-500 mt-2">PAUSED</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsPaused((p) => !p)}
            className="w-32"
          >
            {isPaused ? (
              <>
                <Play className="h-5 w-5 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={handleEndEarly}
            className="w-32 text-muted-foreground hover:text-destructive"
          >
            <X className="h-5 w-5 mr-2" />
            End
          </Button>
        </div>

        {/* Keyboard hints */}
        <div className="text-xs text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-muted mr-1">Space</span> to pause
          <span className="mx-2">|</span>
          <span className="px-1.5 py-0.5 rounded bg-muted mr-1">Esc</span> to end
        </div>
      </div>
    </div>
  );
}
