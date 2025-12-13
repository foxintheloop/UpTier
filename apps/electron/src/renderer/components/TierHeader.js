import { PRIORITY_TIERS } from '@uptier/shared';
import { cn } from '@/lib/utils';
export function TierHeader({ tier, count }) {
    const tierInfo = PRIORITY_TIERS[tier];
    return (<div className={cn('flex items-center gap-2 px-2 py-1 mb-2 text-xs font-medium uppercase tracking-wide', tier === 1 && 'text-red-400', tier === 2 && 'text-amber-400', tier === 3 && 'text-gray-400')}>
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tierInfo.color }}/>
      <span>
        TIER {tier} — {tierInfo.label}
      </span>
      <span className="text-muted-foreground">({count})</span>
    </div>);
}
//# sourceMappingURL=TierHeader.js.map