import { TEIDocument } from '@/lib/tei';
import { Node, Edge } from 'reactflow';
import type { TEINode } from '@/lib/tei/types';

export type ProximityMethod = 'paragraph' | 'dialogue' | 'word' | 'combined';
export type EdgeDirection = 'undirected' | 'directed' | 'both';

export interface ProximityConfig {
  method: ProximityMethod;
  maxDistance: number; // Turns for dialogue, words for word distance
  edgeDirection: EdgeDirection;
  edgeThreshold: number; // Minimum strength to show edge
}

export interface CharacterProximity {
  character1: string;
  character2: string;
  strength: number;
  directedInteractions: Map<string, number>; // source -> count
}

export class ProximityAnalyzer {
  private document: TEIDocument;

  constructor(document: TEIDocument) {
    this.document = document;
  }

  /**
   * Analyze character proximity based on the configured method
   */
  analyze(config: ProximityConfig): { nodes: Node[]; edges: Edge[] } {
    let proximityData: CharacterProximity[];

    switch (config.method) {
      case 'paragraph':
        proximityData = this.analyzeParagraphProximity();
        break;
      case 'dialogue':
        proximityData = this.analyzeDialogueProximity(config.maxDistance);
        break;
      case 'word':
        proximityData = this.analyzeWordDistanceProximity(config.maxDistance);
        break;
      case 'combined':
        proximityData = this.analyzeCombined(config.maxDistance);
        break;
      default:
        proximityData = [];
    }

    return this.buildGraph(proximityData, config);
  }

  /**
   * Paragraph-based strategy: characters appearing in the same paragraph
   */
  private analyzeParagraphProximity(): CharacterProximity[] {
    const proximityMap = new Map<string, CharacterProximity>();
    const tei = this.document.state.parsed.TEI as TEINode | undefined;
    const text = tei?.text as TEINode | undefined;
    const body = text?.body as TEINode | undefined;
    const paragraphs = body?.p;

    if (!paragraphs) return [];

    const paragraphsArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

    // Extract characters from each paragraph
    paragraphsArray.forEach((para: TEINode) => {
      const charactersInPara = this.extractCharactersFromParagraph(para);

      // Create pairwise connections
      for (let i = 0; i < charactersInPara.length; i++) {
        for (let j = i + 1; j < charactersInPara.length; j++) {
          const char1 = charactersInPara[i];
          const char2 = charactersInPara[j];

          const key = this.getPairKey(char1, char2);
          let proximity = proximityMap.get(key);

          if (!proximity) {
            proximity = {
              character1: char1,
              character2: char2,
              strength: 0,
              directedInteractions: new Map(),
            };
            proximityMap.set(key, proximity);
          }

          proximity.strength += 1;
        }
      }
    });

    return Array.from(proximityMap.values());
  }

  /**
   * Dialogue proximity strategy: characters within N turns of each other
   */
  private analyzeDialogueProximity(maxTurns: number): CharacterProximity[] {
    const proximityMap = new Map<string, CharacterProximity>();
    const dialogue = this.document.state.dialogue;

    // Analyze dialogue turns
    for (let i = 0; i < dialogue.length; i++) {
      const currentSpeaker = dialogue[i].speaker;
      if (!currentSpeaker) continue;

      // Look ahead up to maxTurns
      for (let j = i + 1; j <= Math.min(i + maxTurns, dialogue.length - 1); j++) {
        const nextSpeaker = dialogue[j].speaker;
        if (!nextSpeaker || nextSpeaker === currentSpeaker) continue;

        const key = this.getPairKey(currentSpeaker, nextSpeaker);
        let proximity = proximityMap.get(key);

        if (!proximity) {
          proximity = {
            character1: currentSpeaker,
            character2: nextSpeaker,
            strength: 0,
            directedInteractions: new Map(),
          };
          proximityMap.set(key, proximity);
        }

        proximity.strength += 1;

        // Track directed interaction
        const directedKey = `${currentSpeaker}->${nextSpeaker}`;
        const currentCount = proximity.directedInteractions.get(directedKey) || 0;
        proximity.directedInteractions.set(directedKey, currentCount + 1);
      }
    }

    return Array.from(proximityMap.values());
  }

  /**
   * Word distance strategy: characters within X words of each other
   */
  private analyzeWordDistanceProximity(maxWords: number): CharacterProximity[] {
    const proximityMap = new Map<string, CharacterProximity>();
    const tei = this.document.state.parsed.TEI as TEINode | undefined;
    const text = tei?.text as TEINode | undefined;
    const body = text?.body as TEINode | undefined;
    const paragraphs = body?.p;

    if (!paragraphs) return [];

    const paragraphsArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

    paragraphsArray.forEach((para: any) => {
      const characterPositions = this.extractCharacterWordPositions(para);

      // For each character, check proximity to others
      const characters = Array.from(characterPositions.keys());
      for (let i = 0; i < characters.length; i++) {
        for (let j = i + 1; j < characters.length; j++) {
          const char1 = characters[i];
          const char2 = characters[j];

          const positions1 = characterPositions.get(char1) || [];
          const positions2 = characterPositions.get(char2) || [];

          // Check if any positions are within maxWords
          for (const pos1 of positions1) {
            for (const pos2 of positions2) {
              const distance = Math.abs(pos1 - pos2);
              if (distance <= maxWords) {
                const key = this.getPairKey(char1, char2);
                let proximity = proximityMap.get(key);

                if (!proximity) {
                  proximity = {
                    character1: char1,
                    character2: char2,
                    strength: 0,
                    directedInteractions: new Map(),
                  };
                  proximityMap.set(key, proximity);
                }

                proximity.strength += 1;
              }
            }
          }
        }
      }
    });

    return Array.from(proximityMap.values());
  }

  /**
   * Combined mode: uses multiple methods and combines results
   */
  private analyzeCombined(maxDistance: number): CharacterProximity[] {
    const combinedMap = new Map<string, CharacterProximity>();

    // Run all methods and combine results
    const paragraphData = this.analyzeParagraphProximity();
    const dialogueData = this.analyzeDialogueProximity(maxDistance);

    // Merge paragraph data
    paragraphData.forEach((proximity) => {
      const key = this.getPairKey(proximity.character1, proximity.character2);
      const existing = combinedMap.get(key);

      if (existing) {
        existing.strength += proximity.strength;
      } else {
        combinedMap.set(key, { ...proximity });
      }
    });

    // Merge dialogue data
    dialogueData.forEach((proximity) => {
      const key = this.getPairKey(proximity.character1, proximity.character2);
      const existing = combinedMap.get(key);

      if (existing) {
        existing.strength += proximity.strength;
        // Merge directed interactions
        proximity.directedInteractions.forEach((count, directedKey) => {
          const existingCount = existing.directedInteractions.get(directedKey) || 0;
          existing.directedInteractions.set(directedKey, existingCount + count);
        });
      } else {
        combinedMap.set(key, { ...proximity });
      }
    });

    return Array.from(combinedMap.values());
  }

  /**
   * Build ReactFlow graph from proximity data
   */
  private buildGraph(
    proximityData: CharacterProximity[],
    config: ProximityConfig
  ): {
    nodes: Node[];
    edges: Edge[];
  } {
    // Collect all unique characters
    const characterSet = new Set<string>();
    proximityData.forEach((prox) => {
      characterSet.add(prox.character1);
      characterSet.add(prox.character2);
    });

    // Get character details for display
    const characters = this.document.state.characters;
    const characterDetails = new Map<string, any>();
    characters.forEach((char) => {
      const id = char.xmlId;
      characterDetails.set(id, char);
    });

    // Count dialogue per character
    const dialogue = this.document.state.dialogue;
    const dialogueCounts = new Map<string, number>();
    dialogue.forEach((d) => {
      if (d.speaker) {
        const count = dialogueCounts.get(d.speaker) || 0;
        dialogueCounts.set(d.speaker, count + 1);
      }
    });

    // Create nodes
    const nodes: Node[] = Array.from(characterSet).map((id) => {
      const details = characterDetails.get(id);
      const displayName = details?.persName || id.replace(/^#/, '');
      const dialogueCount = dialogueCounts.get(id) || 0;

      return {
        id,
        type: 'character',
        position: { x: 0, y: 0 },
        data: {
          label: displayName,
          value: dialogueCount,
        },
      };
    });

    // Create edges based on configuration
    const edges: Edge[] = [];
    const processedPairs = new Set<string>();

    proximityData.forEach((prox) => {
      // Filter by edge threshold
      if (prox.strength < config.edgeThreshold) return;

      const pairKey = this.getPairKey(prox.character1, prox.character2);

      if (config.edgeDirection === 'both') {
        // Add both undirected and directed edges
        if (!processedPairs.has(pairKey)) {
          // Undirected edge
          edges.push({
            id: `${pairKey}-undirected`,
            source: prox.character1,
            target: prox.character2,
            label: `${prox.strength}`,
            data: { value: prox.strength },
            animated: false,
            style: {
              stroke: '#b1b1b7',
              strokeWidth: Math.min(prox.strength, 5),
            },
            type: 'straight',
          });
          processedPairs.add(pairKey);
        }

        // Directed edges
        prox.directedInteractions.forEach((count, directedKey) => {
          const [source, target] = directedKey.split('->');
          edges.push({
            id: `${pairKey}-directed-${directedKey}`,
            source,
            target,
            label: `${count}`,
            data: { value: count },
            animated: true,
            style: {
              stroke: this.getDirectionColor(source, target),
              strokeWidth: Math.min(count, 3),
            },
            type: 'smoothstep',
          });
        });
      } else if (config.edgeDirection === 'directed') {
        // Only directed edges
        prox.directedInteractions.forEach((count, directedKey) => {
          const [source, target] = directedKey.split('->');
          edges.push({
            id: `${pairKey}-directed`,
            source,
            target,
            label: `${count}`,
            data: { value: count },
            animated: true,
            style: {
              stroke: this.getDirectionColor(source, target),
              strokeWidth: Math.min(count, 3),
            },
          });
        });
      } else {
        // Undirected only
        if (!processedPairs.has(pairKey)) {
          edges.push({
            id: pairKey,
            source: prox.character1,
            target: prox.character2,
            label: `${prox.strength}`,
            data: { value: prox.strength },
            animated: false,
            style: {
              stroke: '#b1b1b7',
              strokeWidth: Math.min(prox.strength, 5),
            },
          });
          processedPairs.add(pairKey);
        }
      }
    });

    // Layout nodes in a circle
    const angleStep = (2 * Math.PI) / nodes.length;
    const radius = Math.max(150, nodes.length * 30);

    nodes.forEach((node, i) => {
      const angle = i * angleStep;
      node.position = {
        x: 250 + radius * Math.cos(angle) - 75,
        y: 250 + radius * Math.sin(angle) - 40,
      };
    });

    return { nodes, edges };
  }

  /**
   * Extract all character IDs from a paragraph
   */
  private extractCharactersFromParagraph(para: any): string[] {
    const characters: string[] = [];

    function traverse(node: any) {
      if (!node || typeof node !== 'object') return;

      if (Array.isArray(node)) {
        node.forEach(traverse);
      } else {
        // Check for <said> elements with @who attribute
        if (node['@_who']) {
          characters.push(node['@_who']);
        }
        // Traverse nested elements
        for (const key in node) {
          if (!key.startsWith('#') && !key.startsWith('@_')) {
            traverse(node[key]);
          }
        }
      }
    }

    traverse(para);
    return [...new Set(characters)]; // Remove duplicates
  }

  /**
   * Extract character word positions from a paragraph
   * Returns a map of character ID to array of word positions
   */
  private extractCharacterWordPositions(para: any): Map<string, number[]> {
    const positions = new Map<string, number[]>();
    let currentPosition = 0;

    function traverse(node: any) {
      if (!node || typeof node !== 'object') return;

      // Track text content
      if (node['#text']) {
        const words = node['#text'].split(/\s+/).length;
        currentPosition += words;
      }

      // Check for <said> elements
      if (node['@_who']) {
        const charId = node['@_who'];
        const existingPositions = positions.get(charId) || [];
        existingPositions.push(currentPosition);
        positions.set(charId, existingPositions);
      }

      // Traverse nested elements
      for (const key in node) {
        if (!key.startsWith('#') && !key.startsWith('@_')) {
          traverse(node[key]);
        }
      }
    }

    traverse(para);
    return positions;
  }

  /**
   * Get a consistent key for a character pair (alphabetically sorted)
   */
  private getPairKey(char1: string, char2: string): string {
    const [first, second] = [char1, char2].sort();
    return `${first}-${second}`;
  }

  /**
   * Get a color for directed edge based on character hash
   */
  private getDirectionColor(source: string, target: string): string {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const hash = (source + target).split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    return colors[hash % colors.length];
  }
}
