import { describe, it, expect } from '@jest/globals';
import { detectEntityTypeFromAttribute, getEntities } from '@/lib/validation/EntityDetector';
import type { TEIDocument } from '@/lib/tei/types';

describe('EntityDetector', () => {
  it('should detect character from @who attribute', () => {
    const entityType = detectEntityTypeFromAttribute('said', 'who');
    expect(entityType).toBe('character');
  });

  it('should detect character from @ref on persName', () => {
    const entityType = detectEntityTypeFromAttribute('persName', 'ref');
    expect(entityType).toBe('character');
  });

  it('should detect place from @ref on placeName', () => {
    const entityType = detectEntityTypeFromAttribute('placeName', 'ref');
    expect(entityType).toBe('place');
  });

  it('should get character entities from document', () => {
    const document: TEIDocument = {
      state: {
        characters: [
          { id: 'char-1', name: 'John' },
          { id: 'char-2', name: 'Jane' },
        ],
        parsed: {},
        passages: [],
        revision: 0,
      },
      events: [],
    };

    const entities = getEntities(document, 'character');
    expect(entities).toHaveLength(2);
    expect(entities[0].id).toBe('char-1');
  });
});
