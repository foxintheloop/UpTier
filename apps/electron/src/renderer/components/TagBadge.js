import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
export function TagBadge({ tag, onRemove, className }) {
    return (<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)} style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
            border: `1px solid ${tag.color}40`,
        }}>
      {tag.name}
      {onRemove && (<button onClick={(e) => {
                e.stopPropagation();
                onRemove();
            }} className="ml-0.5 hover:opacity-70 transition-opacity">
          <X className="h-3 w-3"/>
        </button>)}
    </span>);
}
//# sourceMappingURL=TagBadge.js.map