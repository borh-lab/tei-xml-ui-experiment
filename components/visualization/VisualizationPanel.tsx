// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CharacterNetwork } from '@/components/visualization/CharacterNetwork';
import { DialogueStats } from '@/components/visualization/DialogueStats';
import { DocumentAnalytics } from '@/components/analytics/DocumentAnalytics';
import { Card } from '@/components/ui/card';

export function VisualizationPanel() {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

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
          <CharacterNetwork onNodeClick={setSelectedCharacter} />
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
