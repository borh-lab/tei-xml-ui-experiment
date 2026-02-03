import {
  createSchemaSelection,
  transitionSchemaSelection,
  SchemaSelectionManager
} from '@/lib/schema/SchemaSelection';
import { FileSchemaResolver } from '@/lib/schema/FileSchemaResolver';
import { SchemaInfo } from '@/lib/schema/SchemaResolver';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

const mockStorage = {
  getItem: jest.spyOn(localStorageMock, 'getItem'),
  setItem: jest.spyOn(localStorageMock, 'setItem')
};

describe('createSchemaSelection', () => {
  it('should create selection with timestamp', () => {
    const selection = createSchemaSelection('tei-minimal');
    expect(selection.schemaId).toBe('tei-minimal');
    expect(selection.timestamp).toBeGreaterThan(0);
    expect(Object.isFrozen(selection)).toBe(true);
  });
});

describe('transitionSchemaSelection', () => {
  it('should create new history state', () => {
    const history = {
      current: createSchemaSelection('tei-minimal'),
      previous: []
    };

    const newHistory = transitionSchemaSelection(history, 'tei-all');

    expect(newHistory.current.schemaId).toBe('tei-all');
    expect(newHistory.previous[0].schemaId).toBe('tei-minimal');
  });

  it('should keep last 10 previous selections', () => {
    let history = {
      current: createSchemaSelection('tei-minimal'),
      previous: []
    };

    // Add 15 selections
    for (let i = 0; i < 15; i++) {
      history = transitionSchemaSelection(history, `schema-${i}`);
    }

    expect(history.previous).toHaveLength(10);
  });
});

describe('SchemaSelectionManager', () => {
  let resolver: FileSchemaResolver;
  let manager: SchemaSelectionManager;

  beforeEach(() => {
    const mockSchemas: Record<string, SchemaInfo> = {
      'tei-minimal': {
        id: 'tei-minimal',
        name: 'TEI Minimal',
        description: 'Test',
        path: '/schemas/tei-minimal.rng',
        tags: []
      }
    };

    resolver = new FileSchemaResolver(mockSchemas, new Set(['tei-minimal']));
    manager = new SchemaSelectionManager(resolver);
    mockStorage.getItem.mockClear();
    mockStorage.setItem.mockClear();
  });

  it('should return default when no stored value', () => {
    mockStorage.getItem.mockReturnValue(null);

    const selection = manager.load();

    expect(selection.schemaId).toBe('tei-minimal');
  });

  it('should load stored selection if valid', () => {
    const stored = JSON.stringify({
      schemaId: 'tei-minimal',
      timestamp: Date.now()
    });
    mockStorage.getItem.mockReturnValue(stored);

    const selection = manager.load();

    expect(selection.schemaId).toBe('tei-minimal');
  });

  it('should return default if stored schema no longer exists', () => {
    const stored = JSON.stringify({
      schemaId: 'deleted-schema',
      timestamp: Date.now()
    });
    mockStorage.getItem.mockReturnValue(stored);

    const selection = manager.load();

    expect(selection.schemaId).toBe('tei-minimal');
  });

  it('should save selection to storage', () => {
    const selection = createSchemaSelection('tei-minimal');
    manager.save(selection);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'tei:selected-schema',
      expect.stringContaining('tei-minimal')
    );
  });
});
