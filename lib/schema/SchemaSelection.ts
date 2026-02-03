import { SchemaResolver } from './SchemaResolver';

/**
 * Schema selection state
 * Modeled as a value, not a place
 */
export interface SchemaSelection {
  readonly schemaId: string;
  readonly timestamp: number;
}

/**
 * Schema selection with history
 */
export interface SchemaSelectionHistory {
  readonly current: SchemaSelection;
  readonly previous: ReadonlyArray<SchemaSelection>;
}

/**
 * Create a new schema selection
 */
export function createSchemaSelection(schemaId: string): SchemaSelection {
  return Object.freeze({
    schemaId,
    timestamp: Date.now()
  });
}

/**
 * Transition to a new schema selection
 * Returns new state, doesn't mutate
 */
export function transitionSchemaSelection(
  history: SchemaSelectionHistory,
  newSchemaId: string
): SchemaSelectionHistory {
  const newSelection = createSchemaSelection(newSchemaId);

  return Object.freeze({
    current: newSelection,
    previous: [history.current, ...history.previous.slice(0, 9)]
  });
}

/**
 * Schema selection manager
 */
export class SchemaSelectionManager {
  constructor(
    private readonly resolver: SchemaResolver,
    private readonly storageKey: string = 'tei:selected-schema'
  ) {}

  load(): SchemaSelection {
    const stored = localStorage.getItem(this.storageKey);

    if (!stored) {
      return createSchemaSelection('tei-minimal');
    }

    try {
      const parsed = JSON.parse(stored) as SchemaSelection;

      if (this.resolver.has(parsed.schemaId)) {
        return Object.freeze(parsed);
      }

      return createSchemaSelection('tei-minimal');
    } catch {
      return createSchemaSelection('tei-minimal');
    }
  }

  save(selection: SchemaSelection): SchemaSelection {
    localStorage.setItem(this.storageKey, JSON.stringify(selection));
    return selection;
  }

  transition(
    history: SchemaSelectionHistory,
    newSchemaId: string
  ): SchemaSelectionHistory {
    const newHistory = transitionSchemaSelection(history, newSchemaId);
    this.save(newHistory.current);
    return newHistory;
  }
}
