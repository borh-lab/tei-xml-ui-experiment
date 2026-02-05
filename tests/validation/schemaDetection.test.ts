import { describe, it, expect } from '@jest/globals';
import { detectSchemaPath } from '@/lib/validation/schemaDetection';
import type { TEIDocument } from '@/lib/tei/types';

describe('Schema Detection', () => {
  it('should detect tei-novel schema from profile', () => {
    const document: TEIDocument = {
      state: {
        teiHeader: {
          profileDesc: {
            langUsage: [{ ident: 'tei-novel' }],
          },
        },
        parsed: {},
        passages: [],
        characters: [],
        revision: 0,
      },
      events: [],
    };

    const path = detectSchemaPath(document);
    expect(path).toBe('/public/schemas/tei-novel.rng');
  });

  it('should default to tei-all when no profile specified', () => {
    const document: TEIDocument = {
      state: {
        parsed: {},
        passages: [],
        characters: [],
        revision: 0,
      },
      events: [],
    };

    const path = detectSchemaPath(document);
    expect(path).toBe('/public/schemas/tei-all.rng');
  });
});
