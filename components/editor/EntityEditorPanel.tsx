'use client';

import React, { useState } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CharacterForm } from './CharacterForm';
import { RelationshipEditor } from './RelationshipEditor';
import { Plus } from 'lucide-react';

interface EntityEditorPanelProps {
  open: boolean;
  onClose: () => void;
}

export function EntityEditorPanel({ open, onClose }: EntityEditorPanelProps) {
  const { document } = useDocumentContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [relationships, setRelationships] = useState<any[]>([]);
  const characters = document?.getCharacters() || [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Entity Editor</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="characters" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="characters">Characters</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="ner">NER Tags</TabsTrigger>
          </TabsList>

          <TabsContent value="characters" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Characters ({characters.length})</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {showAddForm && (
              <CharacterForm
                onSave={(character) => {
                  document?.addCharacter(character);
                  setShowAddForm(false);
                }}
                onCancel={() => setShowAddForm(false)}
              />
            )}

            {characters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No characters yet. Add your first character to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {characters.map((char: any) => (
                  <div key={char['xml:id']} className="p-3 border rounded-lg">
                    <p className="font-medium">{char.persName}</p>
                    <p className="text-xs text-muted-foreground">ID: {char['xml:id']}</p>
                    {char.sex && <p className="text-xs">Sex: {char.sex}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="relationships" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Relationships ({relationships.length})</h3>
            </div>

            <RelationshipEditor
              onAddRelation={(relation) => {
                document?.addRelation(relation);
                setRelationships([...relationships, relation]);
              }}
            />

            {relationships.length > 0 && (
              <div className="space-y-2">
                {relationships.map((rel) => (
                  <div key={rel.id} className="p-3 border rounded-lg text-sm">
                    <p><strong>{rel.type}</strong>: {rel.from} → {rel.to}</p>
                    {rel.subtype && <p className="text-xs text-muted-foreground">{rel.subtype}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ner">
            <p className="text-sm text-muted-foreground">NER tag editor coming soon...</p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
