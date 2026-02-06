/**
 * useHints Hook
 *
 * Validates selection and generates hints in real-time.
 * Uses debouncing to prevent excessive validation during selection changes.
 */

import { useEffect, useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';
import { validateSelection } from '@/lib/protocols/validation';
import { generateHint } from '@/lib/protocols/hints';
import { useDocumentV2 } from '@/hooks/useDocumentV2';
import type { DocumentState } from '@/lib/values/DocumentState';
import type { Selection } from '@/lib/values/Selection';
import type { Hint } from '@/lib/values/Hint';

interface UseHintsOptions {
  initialState?: DocumentState;
}

/**
 * Hook to validate selection and generate hints
 *
 * @param selection - Current text selection (or null)
 * @param activeTagType - The tag type currently being applied
 * @param debounceDelay - Delay in ms before validating (default: 500)
 * @param options - Optional initial state
 * @returns Hint object or null if no hint available
 */
export function useHints(
  selection: Selection | null,
  activeTagType: string,
  debounceDelay: number = 500,
  options?: UseHintsOptions
): Hint | null {
  const { state } = useDocumentV2(options?.initialState);
  const [hint, setHint] = useState<Hint | null>(null);

  // Debounce selection to avoid excessive validation
  const debouncedSelection = useDebouncedValue(selection, debounceDelay);

  useEffect(() => {
    // Clear hint when selection is null
    if (!debouncedSelection || !state.document) {
      setHint(null);
      return;
    }

    // Validate selection
    const validationResult = validateSelection(
      debouncedSelection,
      activeTagType,
      {}, // No custom attributes yet
      state.document
    );

    // Generate hint from validation result
    if (validationResult.success) {
      const newHint = generateHint(validationResult.value, activeTagType);
      setHint(newHint);
    } else {
      // Validation failed - no hint available
      setHint(null);
    }
  }, [debouncedSelection, activeTagType, state.document]);

  return hint;
}
