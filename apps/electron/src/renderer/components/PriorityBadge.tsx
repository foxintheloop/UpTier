import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { PriorityTier } from '@uptier/shared';
import { PRIORITY_TIERS } from '@uptier/shared';

interface PriorityBadgeProps {
  tier: PriorityTier;
  reasoning?: string | null;
}

export function PriorityBadge({ tier, reasoning }: PriorityBadgeProps) {
  const tierInfo = PRIORITY_TIERS[tier];
  const variant = tier === 1 ? 'tier1' : tier === 2 ? 'tier2' : 'tier3';

  const badge = (
    <Badge variant={variant} className="text-xs">
      Tier {tier}
    </Badge>
  );

  if (reasoning) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="text-xs">
              <p className="font-medium mb-1">{tierInfo.label}</p>
              <p className="text-muted-foreground">{reasoning}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
