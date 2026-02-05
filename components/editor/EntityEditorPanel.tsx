// @ts-nocheck
'use client';

import { useState, useCallback } from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CharacterForm } from './CharacterForm';
import { RelationshipEditor } from './RelationshipEditor';
import { CharacterNetwork } from '@/components/visualization/CharacterNetwork';
import { Plus } from 'lucide-react';
import type { Character, CharacterID, Relationship } from '@/lib/tei/types';
import { toast } from '@/components/ui/use-toast';

interface EntityEditorPanelProps {
  open: boolean;
  onClose: () => void;
}

export function EntityEditorPanel({ open, onClose }: EntityEditorPanelProps) {
  const {
    document,
    addCharacter,
    updateCharacter: _updateCharacter,
    removeCharacter,
    addRelationship,
    removeRelationship,
  } = useDocumentService();
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [activeTab, setActiveTab] = useState<'characters' | 'relationships' | 'network'>(
    'characters'
  );

  // Direct access to state - no repository needed
  const characters = document?.state.characters || [];
  const relationships = document?.state.relationships || [];

  // Add character handler
  const handleAddCharacter = useCallback(
    async (character: Character) => {
      if (!document) return;

      // Basic validation
      if (!character.name || character.name.trim() === '') {
        toast.error('Character name is required');
        return;
      }

      try {
        await addCharacter(character);
        setShowAddCharacter(false);
        toast.success('Character added', {
          description: `${character.name} has been added.`,
        });
      } catch (error) {
        console.error('Failed to add character:', error);
        toast.error('Failed to add character', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [document, addCharacter]
  );

  // Remove character handler
  const handleRemoveCharacter = useCallback(
    async (id: CharacterID) => {
      if (!document) return;

      await removeCharacter(id);
      toast.success('Character removed');
    },
    [document, removeCharacter]
  );

  // Add relationship handler
  const handleAddRelation = useCallback(
    async (relation: Omit<Relationship, 'id'>) => {
      if (!document) return;

      // Basic validation
      if (relation.from === relation.to) {
        toast.error('Cannot create relationship with same character');
        return;
      }

      try {
        await addRelationship(relation);
        toast.success('Relationship added');
      } catch (error) {
        console.error('Failed to add relationship:', error);
        toast.error('Failed to add relationship', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [document, addRelationship]
  );

  // Remove relationship handler
  const handleRemoveRelation = useCallback(
    async (id: string) => {
      if (!document) return;

      await removeRelationship(id);
      toast.success('Relationship removed');
    },
    [document, removeRelationship]
  );

  if (!document) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Entity Editor</SheetTitle>
        </SheetHeader>

        <Tabs
          defaultValue="characters"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="characters">Characters ({characters.length})</TabsTrigger>
            <TabsTrigger value="relationships">Relationships ({relationships.length})</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>

          {/* Characters Tab */}
          <TabsContent value="characters" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Characters</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddCharacter(!showAddCharacter)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {showAddCharacter && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <CharacterForm
                  onSave={handleAddCharacter}
                  onCancel={() => {
                    setShowAddCharacter(false);
                  }}
                />
              </div>
            )}

            {characters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No characters yet. Add your first character to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="p-3 border rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{char.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {char.sex && `${char.sex} • `}
                        {char.age && `${char.age} years old • `}
                        ID: {char.xmlId}
                      </p>
                      {char.occupation && (
                        <p className="text-xs text-muted-foreground">{char.occupation}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveCharacter(char.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Relationships</h3>
            </div>

            <RelationshipEditor
              characters={characters}
              onAddRelation={handleAddRelation}
            />

            {relationships.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No relationships yet. Add your first relationship to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {relationships.map((rel) => {
                  const fromChar = characters.find((c) => c.id === rel.from);
                  const toChar = characters.find((c) => c.id === rel.to);
                  return (
                    <div
                      key={rel.id}
                      className="p-3 border rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium capitalize">{rel.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {fromChar?.name || rel.from} → {toChar?.name || rel.to}
                        </p>
                        {rel.subtype && (
                          <p className="text-xs text-muted-foreground">{rel.subtype}</p>
                        )}
                        {rel.mutual && <p className="text-xs text-primary">Mutual</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveRelation(rel.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Character Network</h3>
            </div>
            <CharacterNetwork document={document} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
