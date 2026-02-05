// @ts-nocheck
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

/**
 * VisualizationPanel - Effect-based version
 *
 * Already uses useDocumentService internally, so this is just a wrapper
 * for feature flag consistency.
 */
export function EffectVisualizationPanel() {
  const { useDocumentService } = require('@/lib/effect/react/hooks');
  const { document } = useDocumentService();
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  // Dynamically import components to avoid circular dependencies
  const CharacterNetwork = require('./CharacterNetwork').default;
  const DialogueStats = require('./DialogueStats').default;
  const DocumentAnalytics = require('@/components/analytics/DocumentAnalytics').DocumentAnalytics;

  return (
    <Card className="m-2 h-[calc(100vh-8rem)] overflow-auto">
      <Tabs defaultValue="network" className="h-full flex flex-col">
        <div className="px-6 pt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="network" className="flex-1 mt-4 px-6 pb-6">
          {document && <CharacterNetwork document={document} onNodeClick={setSelectedCharacter} />}
          {selectedCharacter && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <p className="text-sm font-semibold">Selected: {selectedCharacter}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Character details and interactions would be shown here.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="flex-1 mt-4 px-6 pb-6">
          <DialogueStats />
        </TabsContent>

        <TabsContent value="analytics" className="flex-1 mt-4 px-6 pb-6">
          <DocumentAnalytics />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

/**
 * VisualizationPanel with feature flag support
 *
 * Automatically switches between React and Effect implementations
 * based on feature-useEffectVisualization feature flag.
 *
 * For now, we default to React version until Effect is fully tested.
 */
export default function VisualizationPanel() {
  // Check if Effect version should be used
  const useEffect = typeof window !== 'undefined'
    ? localStorage.getItem('feature-useEffectVisualization') === 'true'
    : false;

  if (useEffect) {
    return <EffectVisualizationPanel />;
  }

  // Fall back to React version (which also uses Effect services internally)
  const ReactVisualizationPanel = require('./VisualizationPanel').VisualizationPanel;
  return <ReactVisualizationPanel />;
}
