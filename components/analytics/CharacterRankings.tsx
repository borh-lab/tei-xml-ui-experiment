// @ts-nocheck
import type { CharacterRanking as RankingType } from '../../lib/analytics/types';

interface CharacterRankingsProps {
  rankings: readonly RankingType[];
}

export function CharacterRankings({ rankings }: CharacterRankingsProps) {
  if (!rankings || rankings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted">
        <p className="text-sm">No dialogue found in this document</p>
      </div>
    );
  }

  const maxCount = rankings[0].quoteCount;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Top Speakers</h3>
      <ul className="space-y-2">
        {rankings.slice(0, 10).map((ranking) => (
          <li key={ranking.characterId} className="flex items-center gap-2">
            <span className="w-24 truncate">{ranking.characterName}</span>
            <div
              className="flex-1 bg-muted rounded h-6 relative"
              role="progressbar"
              aria-valuenow={ranking.quoteCount}
              aria-valuemin={0}
              aria-valuemax={maxCount}
              aria-label={`${ranking.characterName}: ${ranking.quoteCount} quotes`}
            >
              <div
                className="h-6 rounded bg-primary absolute top-0 left-0"
                style={{ width: `${(ranking.quoteCount / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-sm w-24 text-right">
              {ranking.quoteCount} ({ranking.percent.toFixed(1)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
