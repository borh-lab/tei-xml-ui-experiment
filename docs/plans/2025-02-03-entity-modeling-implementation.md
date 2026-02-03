# Entity Modeling Plan: Characters, Relationships & Network Visualization

> **Goal:** Implement character inventory management, relationship tracking, and character network visualization using immutable architecture with explicit time modeling.

**Architecture:** Characters and relationships are immutable values. Changes create new document states. Character network visualization computes positions from current state (no layout state).

**Tech Stack:** TypeScript, React Flow, React 19, D3.js (for network viz), Foundation types

**Dependencies:** Requires Foundation Plan (immutable TEIDocument)

---

## Executive Summary

This plan implements **entity modeling features** for managing characters, defining relationships, and visualizing character networks. Key improvements from original plan:

### Key Changes from Original Plan

**Before (mutation-heavy, tight coupling):**
```typescript
// ❌ Mutates document in-place
doc.addCharacter(character);
doc.addRelation(relation);

// ❌ UI tightly coupled to TEIDocument
<EntityEditorPanel
  open={true}
  onClose={() => {
    document?.addCharacter(character);  // ❌ Direct mutation
  }}
/>

// ❌ CharacterNetwork maintains layout state
const [nodes, setNodes] = useState([]); // ❌ Hidden state
```

**After (immutable, protocol-based):**
```typescript
// ✅ Pure functions return new document
const newDoc = addCharacter(doc, character);
const newDoc = addRelation(newDoc, relation);

// ✅ UI depends on repository protocol
interface EntityRepository {
  addCharacter(char: Character): void;
  getCharacters(): Character[];
}
<EntityEditorPanel repository={repository} />

// ✌ Network visualization is computed, not stored
const networkLayout = computeNetworkLayout(doc.characters, doc.relationships);
```

---

## Core Data Structures

### 1. Entity Types

**Files:**
- Extend: `lib/tei/types.ts` (add entity types)

**Type Definitions:**
```typescript
// lib/tei/types.ts (additions)

// Character as immutable value
export interface Character {
  readonly id: CharacterID;
  readonly xmlId: string;           // TEI @xml:id
  readonly name: string;           // persName content
  readonly sex?: 'M' | 'F' | 'Other';
  readonly age?: number;
  readonly occupation?: string;
  readonly traits?: readonly string[];  // Personality traits
  readonly socialStatus?: string;
  readonly maritalStatus?: string;
}

// Relationship as immutable value
export interface Relationship {
  readonly id: string;
  readonly from: CharacterID;      // Subject
  readonly to: CharacterID;        // Object
  readonly type: RelationshipType;
  readonly subtype?: string;
  readonly mutual: boolean;
}

export type RelationshipType =
  | 'family'
  | 'romantic'
  | 'social'
  | 'professional'
  | 'antagonistic';

// Network visualization types
export interface NetworkNode {
  readonly id: CharacterID;
  readonly name: string;
  readonly sex: Character['sex'];
  readonly connections: number;  // Derived, not stored
}

export interface NetworkEdge {
  readonly from: CharacterID;
  readonly to: CharacterID;
  readonly type: RelationshipType;
  readonly mutual: boolean;
  readonly weight: number;        // Derived from dialogue frequency
}

export interface NetworkLayout {
  readonly nodes: readonly NetworkNode[];
  readonly edges: readonly NetworkEdge[];
  readonly layout: {
    readonly nodes: readonly { id: string; x: number; y: number }[];
    readonly edges: readonly { source: string; target: string }[];
  };
}
```

---

## Entity Operations (Pure Functions)

### 2. Character CRUD Operations

**Files:**
- Create: `lib/tei/entity-operations.ts`

**Implementation:**
```typescript
// lib/tei/entity-operations.ts

import { TEIDocument } from './types';
import type { CharacterID, Character, Relationship } from './types';

/**
 * ✅ Pure function: Add character to document
 */
export function addCharacter(doc: TEIDocument, character: Character): TEIDocument {
  // Check for duplicate xml:id
  const existing = doc.state.characters.find(c => c.xmlId === character.xmlId);
  if (existing) {
    throw new Error(`Character with xml:id "${character.xmlId}" already exists`);
  }

  const updatedCharacters = [...doc.state.characters, character];

  const state = {
    ...doc.state,
    characters: updatedCharacters,
    revision: doc.state.revision + 1
  };

  const event = {
    type: 'characterAdded' as const,
    id: character.id,
    character,
    timestamp: Date.now(),
    revision: state.revision
  };

  return { state, events: [...doc.events, event] };
}

/**
 * ✅ Pure function: Update character
 */
export function updateCharacter(
  doc: TEIDocument,
  characterId: CharacterID,
  updates: Partial<Omit<Character, 'id' | 'xmlId'>>
): TEIDocument {
  const character = doc.state.characters.find(c => c.id === characterId);
  if (!character) {
    throw new Error(`Character not found: ${characterId}`);
  }

  const updatedCharacter: Character = {
    ...character,
    ...updates
  };

  const updatedCharacters = doc.state.characters.map(c =>
    c.id === characterId ? updatedCharacter : c
  );

  const state = {
    ...doc.state,
    characters: updatedCharacters,
    revision: doc.state.revision + 1
  };

  // Use generic event for character updates
  const event = {
    type: 'characterUpdated' as const,
    id: characterId,
    updates,
    timestamp: Date.now(),
    revision: state.revision
  };

  return { state, events: [...doc.events, event] };
}

/**
 * ✅ Pure function: Remove character
 */
export function removeCharacter(doc: TEIDocument, characterId: CharacterID): TEIDocument {
  // Also remove all relationships involving this character
  const state = doc.state;

  const updatedCharacters = state.characters.filter(c => c.id !== characterId);
  const updatedRelationships = state.relationships.filter(
    r => r.from !== characterId && r.to !== characterId
  );

  const event = {
    type: 'characterRemoved' as const,
    id: characterId,
    timestamp: Date.now(),
    revision: state.revision + 1
  };

  return {
    state: {
      ...state,
      characters: updatedCharacters,
      relationships: updatedRelationships,
      revision: state.revision + 1
    },
    events: [...doc.events, event]
  };
}
```

---

### 3. Relationship Operations

**Files:**
- Extend: `lib/tei/entity-operations.ts`

**Implementation:**
```typescript
/**
 * ✅ Pure function: Add relationship
 */
export function addRelation(
  doc: TEIDocument,
  relation: Omit<Relationship, 'id'>
): TEIDocument {
  // Validate characters exist
  const charactersExist =
    doc.state.characters.some(c => c.id === relation.from) &&
    doc.state.characters.some(c => c.id === relation.to);

  if (!charactersExist) {
    throw new Error('One or both characters not found');
  }

  // Check for duplicate
  const existing = doc.state.relationships.find(
    r => r.from === relation.from && r.to === relation.to && r.type === relation.type
  );
  if (existing) {
    throw new Error('Relationship already exists');
  }

  // Auto-add reciprocal relationship if mutual
  const relations: Relationship[] = [...doc.state.relationships];
  const newRelation: Relationship = {
    id: crypto.randomUUID(),
    mutual: false,  // Will be set to true if mutual
    ...relation
  };

  relations.push(newRelation);

  if (relation.mutual) {
    relations.push({
      id: crypto.randomUUID(),
      from: relation.to,
      to: relation.from,
      type: relation.type,
      subtype: relation.subtype,
      mutual: true
    });
  }

  const state = {
    ...doc.state,
    relationships: relations,
    revision: doc.state.revision + 1
  };

  const event = {
    type: 'relationAdded' as const,
    id: newRelation.id,
    relation: newRelation,
    timestamp: Date.now(),
    revision: state.revision
  };

  return { state, events: [...doc.events, event] };
}

/**
 * ✅ Pure function: Remove relationship
 */
export function removeRelation(doc: TEIDocument, relationId: string): TEIDocument {
  const relation = doc.state.relationships.find(r => r.id === relationId);
  if (!relation) {
    throw new Error(`Relationship not found: ${relationId}`);
  }

  // If mutual, also remove reciprocal
  let updatedRelationships = doc.state.relationships.filter(r => r.id !== relationId);

  if (relation.mutual) {
    const reciprocal = updatedRelationships.find(
      r => r.from === relation.to && r.to === relation.from && r.type === relation.type
    );
    if (reciprocal) {
      updatedRelationships = updatedRelationships.filter(r => r.id !== reciprocal.id);
    }
  }

  const state = {
    ...doc.state,
    relationships: updatedRelationships,
    revision: doc.state.revision + 1
  };

  const event = {
    type: 'relationRemoved' as const,
    id: relationId,
    timestamp: Date.now(),
    revision: state.revision
  };

  return { state, events: [...doc.events, event] };
}
```

---

## Protocol: Entity Repository

### 4. Repository Interface

**Files:**
- Create: `lib/entities/EntityRepository.ts`

**Protocol Definition:**
```typescript
// lib/entities/EntityRepository.ts

/**
 * ✅ Protocol: Entity operations as first-class interface
 *
 * This defines the contract for entity operations. Different implementations
 * can provide different storage strategies (TEI document, REST API, local storage).
 */
export interface EntityRepository {
  // Query operations (read-only)
  getCharacters(): readonly Character[];
  getCharacter(id: CharacterID): Character | null;
  getRelationships(): readonly Relationship[];
  getRelationshipsForCharacter(characterId: CharacterID): readonly Relationship[];

  // Command operations (return new repository state)
  addCharacter(character: Character): EntityRepository;
  updateCharacter(id: CharacterID, updates: Partial<Character>): EntityRepository;
  removeCharacter(id: CharacterID): EntityRepository;

  addRelation(relation: Omit<Relationship, 'id'>): EntityRepository;
  removeRelation(id: string): EntityRepository;

  // Validation
  validateCharacter(character: Character): ValidationResult;
  validateRelation(relation: Relationship): ValidationResult;
}

/**
 * TEIDocument implementation of EntityRepository
 */
export class TEIDocumentRepository implements EntityRepository {
  constructor(private doc: TEIDocument) {}

  getCharacters(): readonly Character[] {
    return this.doc.state.characters;
  }

  getCharacter(id: CharacterID): Character | null {
    return this.doc.state.characters.find(c => c.id === id) || null;
  }

  getRelationships(): readonly Relationship[] {
    return this.doc.state.relationships;
  }

  getRelationshipsForCharacter(characterId: CharacterID): readonly Relationship[] {
    return this.doc.state.relationships.filter(
      r => r.from === characterId || r.to === characterId
    );
  }

  addCharacter(character: Character): EntityRepository {
    const newDoc = addCharacter(this.doc, character);
    return new TEIDocumentRepository(newDoc);
  }

  updateCharacter(id: CharacterID, updates: Partial<Character>): EntityRepository {
    const newDoc = updateCharacter(this.doc, id, updates);
    return new TEIDocumentRepository(newDoc);
  }

  removeCharacter(id: CharacterID): EntityRepository {
    const newDoc = removeCharacter(this.doc, id);
    return new TEIDocumentRepository(newDoc);
  }

  addRelation(relation: Omit<Relationship, 'id'>): EntityRepository {
    const newDoc = addRelation(this.doc, relation);
    return new TEIDocumentRepository(newDoc);
  }

  removeRelation(id: string): EntityRepository {
    const newDoc = removeRelation(this.doc, id);
    return new TEIDocumentRepository(newDoc);
  }

  validateCharacter(character: Character): ValidationResult {
    const errors: string[] = [];

    if (!character.name || character.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!character.xmlId || character.xmlId.trim().length === 0) {
      errors.push('xml:id is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateRelation(relation: Relationship): ValidationResult {
    const errors: string[] = [];

    if (relation.from === relation.to) {
      errors.push('Character cannot have relationship with itself');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get current document (for context integration)
  getDocument(): TEIDocument {
    return this.doc;
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: readonly string[];
}
```

---

## Character Network Visualization

### 5. Network Layout (Computed, Not Stored)

**Files:**
- Create: `lib/visualization/network-layout.ts`

**Implementation:**
```typescript
// lib/visualization/network-layout.ts

import { Character, Relationship } from '@/lib/tei/types';

/**
 * ✅ Pure function: Compute network layout from characters and relationships
 *
 * Layout is computed on-demand from document state, not stored.
 * This ensures it's always consistent with current data.
 */
export function computeNetworkLayout(
  characters: readonly Character[],
  relationships: readonly Relationship[],
  options?: {
    width?: number;
    height?: number;
    algorithm?: 'force' | 'circular';
  }
): NetworkLayout {
  const width = options?.width || 800;
  const height = options?.height || 600;

  // Build node list
  const nodes = characters.map(char => ({
    id: char.id,
    name: char.name,
    sex: char.sex,
    connections: relationships.filter(
      r => r.from === char.id || r.to === char.id
    ).length
  }));

  // Build edge list
  const edges = relationships.map(rel => ({
    from: rel.from,
    to: rel.to,
    type: rel.type,
    mutual: rel.mutual,
    weight: calculateWeight(rel, characters)
  }));

  // Compute layout using force-directed algorithm
  const layout = forceDirectedLayout(nodes, edges, { width, height });

  return { nodes, edges, layout };
}

/**
 * ✅ Pure function: Calculate edge weight based on dialogue frequency
 */
function calculateWeight(
  relation: Relationship,
  characters: readonly Character[]
): number {
  // TODO: Implement dialogue frequency analysis
  // For now, return 1 for all edges
  return 1;
}

/**
 * ✅ Pure function: Force-directed layout algorithm
 */
function forceDirectedLayout(
  nodes: readonly NetworkNode[],
  edges: readonly NetworkEdge[],
  options: { width: number; height: number }
): { nodes: { id: string; x: number; y: number }[], edges: { source: string; target: string }[] } {
  // Simplified force-directed layout
  // In production, use d3-force or similar library

  const { width, height } = options;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  // Position nodes in circle
  const positionedNodes = nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    return {
      id: node.id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  return {
    nodes: positionedNodes,
    edges: edges.map(e => ({
      source: e.from,
      target: e.to
    }))
  };
}
```

---

## React Components

### 6. Entity Editor Panel

**Files:**
- Create: `components/editor/EntityEditorPanel.tsx`

**Implementation:**
```typescript
// components/editor/EntityEditorPanel.tsx
'use client';

import { useState } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { EntityRepository, TEIDocumentRepository } from '@/lib/entities/EntityRepository';
import { CharacterForm } from './CharacterForm';
import { RelationshipEditor } from './RelationshipEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function EntityEditorPanel() {
  const { doc, dispatch } = useDocumentContext();
  const repository = new TEIDocumentRepository(doc);

  const [activeTab, setActiveTab] = useState<'characters' | 'relationships' | 'network'>('characters');
  const [showAddCharacter, setShowAddCharacter] = useState(false);

  const characters = repository.getCharacters();
  const relationships = repository.getRelationships();

  const handleAddCharacter = (character: Character) => {
    try {
      const validation = repository.validateCharacter(character);
      if (!validation.valid) {
        alert(`Invalid character: ${validation.errors.join(', ')}`);
        return;
      }

      const newRepo = repository.addCharacter(character);
      dispatch({ type: 'SET_DOCUMENT', document: newRepo.getDocument() });
      setShowAddCharacter(false);
    } catch (error) {
      console.error('Failed to add character:', error);
      alert('Failed to add character');
    }
  };

  const handleRemoveCharacter = (id: CharacterID) => {
    const newRepo = repository.removeCharacter(id);
    dispatch({ type: 'SET_DOCUMENT', document: newRepo.getDocument() });
  };

  const handleAddRelation = (relation: Omit<Relationship, 'id'>) => {
    try {
      const newRepo = repository.addRelation(relation);
      dispatch({ type: 'SET_DOCUMENT', document: newRepo.getDocument() });
    } catch (error) {
      console.error('Failed to add relation:', error);
      alert('Failed to add relation');
    }
  };

  return (
    <div className="w-full sm:max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Entity Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="characters">
                Characters ({characters.length})
              </TabsTrigger>
              <TabsTrigger value="relationships">
                Relationships ({relationships.length})
              </TabsTrigger>
              <TabsTrigger value="network">
                Network
              </TabsTrigger>
            </TabsList>

            <TabsContent value="characters" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Characters</h3>
                <Button size="sm" variant="outline" onClick={() => setShowAddCharacter(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {showAddCharacter && (
                <CharacterForm
                  onSave={handleAddCharacter}
                  onCancel={() => setShowAddCharacter(false)}
                />
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
                          {char.sex && `${char.sex} •`} {char.age && `${char.age} years old`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        destructive
                        onClick={() => handleRemoveCharacter(char.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="relationships" className="space-y-4">
              <RelationshipEditor
                characters={characters}
                onAddRelation={handleAddRelation}
              />
            </TabsContent>

            <TabsContent value="network" className="space-y-4">
              <CharacterNetworkVisualization doc={doc} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 7. Character Network Visualization

**Files:**
- Create: `components/visualization/CharacterNetwork.tsx`

**Implementation:**
```typescript
// components/visualization/CharacterNetwork.tsx
'use client';

import React, { useMemo } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import ReactFlow, { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { computeNetworkLayout } from '@/lib/visualization/network-layout';

export function CharacterNetworkVisualization() {
  const { doc } = useDocumentContext();

  const layout = useMemo(() => {
    return computeNetworkLayout(
      doc.state.characters,
      doc.state.relationships,
      { width: 600, height: 400 }
    );
  }, [doc]);

  const nodes: Node[] = layout.nodes.map(node => ({
    id: node.id,
    data: { label: node.name },
    position: { x: layout.layout.nodes.find(n => n.id === node.id)?.x || 0, y: 0 }
  }));

  const edges: Edge[] = layout.edges.map(edge => ({
    id: `${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    label: edge.type,
    animated: true,
    style: {
      stroke: edge.mutual ? '#10b981' : '#64748b'
    }
  }));

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        {/* Background pattern */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </ReactFlow>
    </div>
  );
}
```

---

## Implementation Tasks

### Task 1: Extend Types for Entities
- Add `Character`, `Relationship`, `NetworkNode`, `NetworkEdge` to `lib/tei/types.ts`
- Add `CharacterID`, `TagID`, `PassageID` type aliases
- Export all entity types

### Task 2: Create Entity Operations Module
- Create `lib/tei/entity-operations.ts`
- Implement `addCharacter`, `updateCharacter`, `removeCharacter`
- Implement `addRelation`, `removeRelation`
- Use pure functions, return new document values

### Task 3: Create Entity Repository Protocol
- Create `lib/entities/EntityRepository.ts`
- Define `EntityRepository` interface
- Implement `TEIDocumentRepository` class
- Add validation methods

### Task 4: Update TEI Operations (Foundation Integration)
- Add character CRUD to `lib/tei/operations.ts`
- Add relationship CRUD to `lib/tei/operations.ts`
- Update `serialize()` to include characters/relationships in TEI XML

### Task 5: Create Network Layout Module
- Create `lib/visualization/network-layout.ts`
- Implement `computeNetworkLayout` (pure function)
- Implement force-directed layout algorithm
- Add edge weight calculation

### Task 6: Create Character Form Component
- Create `components/editor/CharacterForm.tsx`
- Implement form fields (name, xml:id, sex, age, etc.)
- Add validation
- Connect to repository

### Task 7: Create Relationship Editor Component
- Create `components/editor/RelationshipEditor.tsx`
- Implement character dropdowns (from/to)
- Implement relationship type selector
- Connect to repository

### Task 8: Create Entity Editor Panel
- Create `components/editor/EntityEditorPanel.tsx`
- Integrate with DocumentContext
- Add tabs for characters, relationships, network
- Wire up all actions

### Task 9: Create Character Network Visualization
- Create `components/visualization/CharacterNetwork.tsx`
- Integrate ReactFlow for network rendering
- Use `computeNetworkLayout` for positions
- Add visual differentiation for node types (sex)

### Task 10: Integrate with Undo/Redo
- Ensure entity operations work with undo/redo
- Test character/relationship operations undo
- Test undo/redo updates network visualization

### Task 11: Unit Tests
- Test entity operations return new documents (no mutation)
- Test repository interface contract
- Test network layout computation
- Test validation logic

### Task 12: Integration Tests
- Test entity editor panel integration
- Test character CRUD workflow
- Test relationship CRUD workflow
- Test network visualization updates

### Task 13: E2E Tests
- Test user adds character via form
- Test user creates relationship
- Test network visualization displays correctly
- Test undo/redo with entity operations

---

## Success Criteria

✅ **Immutability:**
- All character/relationship operations return new document values
- Repository interface enforces value semantics
- Unit tests verify no mutation

✅ **Protocol-Based Design:**
- `EntityRepository` interface decouples UI from TEIDocument
- Can swap implementations (e.g., REST API backend) without changing UI
- Clear contract for operations

✅ **Network Visualization:**
- Layout is computed from current state (no stale layout state)
- Changes to characters/relationships immediately reflected
- Visual differentiation for node types

✅ **Validation:**
- Character/relationship validation before applying
- Clear error messages for validation failures
- Prevents invalid state

✅ **Undo/Redo:**
- Entity operations work with undo/redo system
- Can undo character addition, relationship creation
- Network visualization updates on undo/redo

---

## Dependencies

**Requires:**
- Foundation Plan (immutable TEIDocument)
- Existing: React 19, shadcn/ui components
- New: `reactflow` (for network visualization)

**No changes to:**
- XML parsing/serialization (extend to include entities)
- Rendering pipeline (extend to show entities)
- Tag application (independent, but complementary)

---

## Time Estimates

- Task 1 (Types): 1 hour
- Task 2 (Entity Operations): 3 hours
- Task 3 (Repository): 2 hours
- Task 4 (TEI Operations): 2 hours
- Task 5 (Network Layout): 3 hours
- Task 6 (Character Form): 2 hours
- Task 7 (Relationship Editor): 2 hours
- Task 8 (Entity Panel): 3 hours
- Task 9 (Network Viz): 3 hours
- Task 10 (Undo/Redo): 1 hour
- Task 11-13 (Tests): 5 hours

**Total:** ~27 hours (3-4 days)

---

**Plan Status:** ✅ Ready for implementation
**Complexity:** Medium (protocol design adds some complexity)
**Risk:** Low (builds on Foundation Plan, isolated scope)
