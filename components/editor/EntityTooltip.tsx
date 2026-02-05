'use client';


import { Card } from '@/components/ui/card';

interface EntityTooltipProps {
  entity: Record<string, unknown>;
  position: { x: number; y: number };
  visible: boolean;
}

export function EntityTooltip({ entity, position, visible }: EntityTooltipProps) {
  if (!visible) return null;

  const persName = String(entity.persName || '');
  const sex = entity.sex ? String(entity.sex) : null;
  const age = entity.age ? String(entity.age) : null;
  const occupation = entity.occupation ? String(entity.occupation) : null;
  const role = entity.role ? String(entity.role) : null;

  return (
    <Card
      className="fixed z-50 p-3 shadow-lg pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(8px, 8px)',
      }}
    >
      <h4 className="font-semibold text-sm">{persName}</h4>
      <div className="mt-2 space-y-1 text-xs">
        {sex && (
          <p>
            <span className="font-medium">Sex:</span> {sex}
          </p>
        )}
        {age && (
          <p>
            <span className="font-medium">Age:</span> {age}
          </p>
        )}
        {occupation && (
          <p>
            <span className="font-medium">Occupation:</span> {occupation}
          </p>
        )}
        {role && (
          <p>
            <span className="font-medium">Role:</span> {role}
          </p>
        )}
      </div>
    </Card>
  );
}
