// @ts-nocheck
import type { ConversationMatrix as MatrixType } from '../../lib/analytics/types';

interface ConversationMatrixProps {
  matrix: MatrixType;
}

export function ConversationMatrix({ matrix }: ConversationMatrixProps) {
  if (matrix.totalInteractions === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted">
        <p className="text-sm">No conversations found</p>
      </div>
    );
  }

  const speakers = Array.from(matrix.matrix.keys());
  const maxCount = Math.max(
    ...Array.from(matrix.matrix.values()).flatMap(row => Array.from(row.values()))
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Conversation Matrix</h3>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-2"></th>
              {speakers.map(speaker => (
                <th key={speaker} className="p-2 text-sm font-medium">{speaker}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {speakers.map(speaker => (
              <tr key={speaker}>
                <td className="p-2 text-sm font-medium">{speaker}</td>
                {speakers.map(other => {
                  const count = matrix.matrix.get(speaker)?.get(other) || 0;
                  const intensity = count > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <td key={other} className="p-2">
                      <div
                        className="w-12 h-12 rounded flex items-center justify-center text-xs"
                        style={{
                          backgroundColor: count > 0 ? `rgba(59, 130, 246, ${intensity / 100})` : 'transparent',
                          color: intensity > 50 ? 'white' : 'black'
                        }}
                      >
                        {count || ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
