import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Layers, Sparkles, Rocket, Check } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { FEATURE_PRESETS, type FeatureTier } from '../hooks/useFeatures';

interface OnboardingWizardProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'tier' | 'done';

const TIER_INFO = [
  {
    tier: 'basic' as const,
    label: 'Basic',
    icon: Layers,
    color: 'text-blue-400',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Simple task management. Perfect for getting started.',
    features: [
      'Create and organize tasks',
      'Lists, due dates, and search',
      'Tags and subtasks',
      'Theme customization',
    ],
  },
  {
    tier: 'intermediate' as const,
    label: 'Intermediate',
    icon: Sparkles,
    color: 'text-amber-400',
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-500/10',
    description: 'Productivity tools for organized workflows.',
    features: [
      'Everything in Basic, plus:',
      'Priority tiers and focus timer',
      'Calendar view and goals',
      'Custom filters and notifications',
    ],
  },
  {
    tier: 'advanced' as const,
    label: 'Advanced',
    icon: Rocket,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-500/10',
    description: 'Full power. Every feature enabled.',
    features: [
      'Everything in Intermediate, plus:',
      'Productivity dashboard and analytics',
      'Daily planning ritual and AI suggestions',
      'Deadline alerts, streaks, and more',
    ],
  },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedTier, setSelectedTier] = useState<Exclude<FeatureTier, 'custom'>>('intermediate');
  const queryClient = useQueryClient();

  const handleFinish = async () => {
    const features = FEATURE_PRESETS[selectedTier];
    await window.electronAPI.settings.set({
      onboarding: {
        completed: true,
        tier: selectedTier,
        features,
      },
    });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <div className="w-full max-w-2xl px-8">
        {step === 'welcome' && (
          <WelcomeStep onNext={() => setStep('tier')} />
        )}
        {step === 'tier' && (
          <TierStep
            selected={selectedTier}
            onSelect={setSelectedTier}
            onNext={() => setStep('done')}
            onBack={() => setStep('welcome')}
          />
        )}
        {step === 'done' && (
          <DoneStep
            tier={selectedTier}
            onFinish={handleFinish}
            onBack={() => setStep('tier')}
          />
        )}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to UpTier</h1>
        <p className="text-muted-foreground text-lg">
          Task management that adapts to you.
        </p>
      </div>

      <div className="space-y-4 text-sm text-muted-foreground max-w-md mx-auto">
        <p>
          UpTier has features for every workflow — from simple to-do lists to
          full productivity dashboards with AI suggestions.
        </p>
        <p>
          Choose how much you want to start with. You can always change this later in Settings.
        </p>
      </div>

      <Button onClick={onNext} size="lg" className="mt-4">
        Get Started
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

function TierStep({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: Exclude<FeatureTier, 'custom'>;
  onSelect: (tier: Exclude<FeatureTier, 'custom'>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose your level</h2>
        <p className="text-sm text-muted-foreground">
          Pick a starting point. Toggle individual features anytime in Settings.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {TIER_INFO.map((info) => {
          const isSelected = selected === info.tier;
          const Icon = info.icon;
          return (
            <button
              key={info.tier}
              onClick={() => onSelect(info.tier)}
              className={cn(
                'relative rounded-lg border-2 p-4 text-left transition-all hover:bg-accent/50',
                isSelected
                  ? `${info.borderColor} ${info.bgColor}`
                  : 'border-border'
              )}
            >
              {isSelected && (
                <div className={cn('absolute top-2 right-2 rounded-full p-0.5', info.bgColor)}>
                  <Check className={cn('h-3.5 w-3.5', info.color)} />
                </div>
              )}
              <Icon className={cn('h-6 w-6 mb-3', info.color)} />
              <h3 className="font-semibold mb-1">{info.label}</h3>
              <p className="text-xs text-muted-foreground mb-3">{info.description}</p>
              <ul className="space-y-1.5">
                {info.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className={cn('mt-0.5 shrink-0', info.color)}>-</span>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function DoneStep({
  tier,
  onFinish,
  onBack,
}: {
  tier: Exclude<FeatureTier, 'custom'>;
  onFinish: () => void;
  onBack: () => void;
}) {
  const info = TIER_INFO.find((t) => t.tier === tier)!;
  const Icon = info.icon;

  return (
    <div className="text-center space-y-6">
      <div className={cn('inline-flex items-center justify-center rounded-full p-4', info.bgColor)}>
        <Icon className={cn('h-10 w-10', info.color)} />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">You're all set!</h2>
        <p className="text-muted-foreground">
          Starting with <span className="font-semibold text-foreground">{info.label}</span> features.
        </p>
      </div>

      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        You can toggle individual features or switch presets anytime in Settings.
      </p>

      <div className="flex justify-center gap-3 pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button size="lg" onClick={onFinish}>
          Start Using UpTier
        </Button>
      </div>
    </div>
  );
}
