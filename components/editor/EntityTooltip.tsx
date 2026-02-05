// @ts-nocheck
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface EntityTooltipProps {
  entity: Record<string, unknown>;
  position: { x: number; y: number };
  visible: boolean;
}

export function EntityTooltip({ entity, position, visible }: EntityTooltipProps) {
  if (!visible) return null;

  return (
    <Card
      className="fixed z-50 p-3 shadow-lg pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(8px, 8px)',
      }}
    >
      <h4 className="font-semibold text-sm">{entity.persName}</h4>
      <div className="mt-2 space-y-1 text-xs">
        {entity.sex && (
          <p>
            <span className="font-medium">Sex:</span> {entity.sex}
          </p>
        )}
        {entity.age && (
          <p>
            <span className="font-medium">Age:</span> {entity.age}
          </p>
        )}
        {entity.occupation && (
          <p>
            <span className="font-medium">Occupation:</span> {entity.occupation}
          </p>
        )}
        {entity.role && (
          <p>
            <span className="font-medium">Role:</span> {entity.role}
          </p>
        )}
      </div>
    </Card>
  );
}
