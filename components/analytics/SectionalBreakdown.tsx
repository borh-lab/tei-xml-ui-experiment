// @ts-nocheck
import type { SectionalBreakdown as BreakdownType, SectionGroupingStrategy } from '@/lib/analytics/types';
import { ByPassage, ByChapter } from '@/lib/analytics/sectional';

interface SectionalBreakdownProps {
  breakdown: BreakdownType;
  currentStrategy: SectionGroupingStrategy;
  onStrategyChange: (strategy: SectionGroupingStrategy) => void;
}

export function SectionalBreakdown({
  breakdown,
  currentStrategy,
  onStrategyChange
}: SectionalBreakdownProps) {
  if (breakdown.totalQuotes === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted">
        <p className="text-sm">No dialogue found in this document</p>
      </div>
    );
  }

  const maxCount = Math.max(...breakdown.groups.map(g => g.quoteCount));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {currentStrategy.name}
        </h3>
        <div className="flex gap-2" role="group" aria-label="View granularity">
          {[ByPassage, ByChapter].map(strategy => (
            <button
              key={strategy.name}
              onClick={() => onStrategyChange(strategy)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentStrategy === strategy
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted-foreground/10'
              }`}
              aria-pressed={currentStrategy === strategy}
            >
              {strategy.name.replace('By ', '')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1" role="list" aria-label="Quote counts by section">
        {breakdown.groups.map((group, index) => (
          <div
            key={`${group.label}-${index}`}
            className="flex items-center gap-2"
            role="listitem"
          >
            <span className="w-24 text-sm truncate" title={group.label}>
              {group.label}
            </span>

            <div
              className="flex-1 bg-muted rounded h-6 relative"
              role="progressbar"
              aria-valuenow={group.quoteCount}
              aria-valuemin={0}
              aria-valuemax={maxCount}
              aria-label={`${group.label}: ${group.quoteCount} quotes`}
            >
              <div
                className="h-6 rounded bg-primary absolute top-0 left-0 transition-all"
                style={{
                  width: `${(group.quoteCount / maxCount) * 100}%`,
                  opacity: 0.7 + (index / breakdown.groups.length) * 0.3
                }}
              />
            </div>

            <span className="text-sm w-24 text-right tabular-nums">
              {group.quoteCount} ({group.percent.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>

      <div className="text-sm text-muted-foreground pt-2 border-t">
        Total sections: {breakdown.groups.length} • Total quotes: {breakdown.totalQuotes}
      </div>
    </div>
  );
}
