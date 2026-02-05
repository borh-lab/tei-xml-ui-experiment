/**
 * Smart Selection - Parinfer-like XML Tag Boundary Detection
 *
 * Automatically adjusts user selections to maintain valid XML structure.
 * Inspired by Parinfer (https://shaunlebron.github.io/parinfer/)
 *
 * Key principles:
 * 1. Detect existing tag boundaries
 * 2. Snap selections to valid boundaries
 * 3. Maintain proper nesting (no overlapping tags)
 * 4. Minimal adjustments - change as little as possible
 */

import type { Passage, Tag, TextRange } from '@/lib/tei/types';

/**
 * Tag boundary represents the start or end of a tag in the text
 */
export interface TagBoundary {
  position: number;      // Character offset in passage content
  type: 'open' | 'close'; // Opening or closing tag
  tagName: string;        // Name of the tag (e.g., 'persName', 'said')
  tagId?: string;         // ID of the tag if it exists
  isOuter?: boolean;      // Is this the outer boundary of a tag pair
}

/**
 * Selection adjustment result
 */
export interface SelectionAdjustment {
  originalRange: TextRange;
  adjustedRange: TextRange;
  reason: string;
  snappedTo?: {
    start?: TagBoundary;
    end?: TagBoundary;
  };
}

/**
 * Detect all tag boundaries in a passage
 *
 * @param passage - The passage to analyze
 * @returns Array of tag boundaries sorted by position
 */
export function detectTagBoundaries(passage: Passage): TagBoundary[] {
  const { tags } = passage;
  const boundaries: TagBoundary[] = [];

  for (const tag of tags) {
    // Each tag has both an opening and closing boundary
    boundaries.push({
      position: tag.range.start,
      type: 'open',
      tagName: tag.type,
      tagId: tag.id,
      isOuter: true,
    });

    boundaries.push({
      position: tag.range.end,
      type: 'close',
      tagName: tag.type,
      tagId: tag.id,
      isOuter: true,
    });
  }

  // Sort by position
  return boundaries.sort((a, b) => a.position - b.position);
}

/**
 * Find the nearest tag boundary to a position
 *
 * @param boundaries - Tag boundaries to search
 * @param position - Target position
 * @param type - Prefer 'open' or 'close' boundaries
 * @returns Nearest boundary or undefined
 */
export function findNearestBoundary(
  boundaries: TagBoundary[],
  position: number,
  type?: 'open' | 'close'
): TagBoundary | undefined {
  const filtered = type
    ? boundaries.filter(b => b.type === type)
    : boundaries;

  // Find closest boundary
  let nearest: TagBoundary | undefined;
  let minDistance = Infinity;

  for (const boundary of filtered) {
    const distance = Math.abs(boundary.position - position);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = boundary;
    }
  }

  // Only return if reasonably close (within 10 characters)
  return minDistance <= 10 ? nearest : undefined;
}

/**
 * Check if a selection would split an existing tag
 *
 * @param boundaries - Tag boundaries in the passage
 * @param range - Selection range to check
 * @returns True if selection would split a tag
 */
export function wouldSplitTag(boundaries: TagBoundary[], range: TextRange): boolean {
  const { start, end } = range;

  for (const boundary of boundaries) {
    // Check if boundary is inside selection (not at edges)
    if (boundary.position > start && boundary.position < end) {
      return true;
    }
  }

  return false;
}

/**
 * Find tags that would be overlapped by a selection
 *
 * @param boundaries - Tag boundaries in the passage
 * @param range - Selection range to check
 * @returns Tags that would be overlapped
 */
export function findOverlappingTags(
  boundaries: TagBoundary[],
  range: TextRange
): TagBoundary[] {
  const { start, end } = range;
  const overlapping: TagBoundary[] = [];

  for (const boundary of boundaries) {
    // Tag starts before selection and ends inside/after selection
    if (boundary.type === 'open' && boundary.position < start) {
      const closeBoundary = boundaries.find(
        b => b.tagId === boundary.tagId && b.type === 'close'
      );
      if (closeBoundary && closeBoundary.position > start) {
        overlapping.push(boundary, closeBoundary);
      }
    }
  }

  return overlapping;
}

/**
 * Snap a selection to the nearest valid tag boundaries
 * (Parinfer-like smart adjustment)
 *
 * Strategy:
 * 1. Check if selection would split existing tags
 * 2. If yes, expand to outer boundaries
 * 3. Prefer minimal adjustments
 *
 * @param passage - The passage containing the selection
 * @param range - Original selection range
 * @returns Adjusted selection with reason
 */
export function snapToTagBoundaries(
  passage: Passage,
  range: TextRange
): SelectionAdjustment {
  const boundaries = detectTagBoundaries(passage);
  const { start, end } = range;

  // Check if selection would split tags
  if (wouldSplitTag(boundaries, range)) {
    // Find overlapping tags
    const overlapping = findOverlappingTags(boundaries, range);

    if (overlapping.length > 0) {
      // Expand to include full tags
      const newStart = Math.min(
        start,
        ...overlapping.filter(b => b.type === 'open').map(b => b.position)
      );
      const newEnd = Math.max(
        end,
        ...overlapping.filter(b => b.type === 'close').map(b => b.position)
      );

      return {
        originalRange: range,
        adjustedRange: { start: newStart, end: newEnd },
        reason: 'Selection expanded to include complete tag(s)',
        snappedTo: {
          start: overlapping.find(b => b.type === 'open' && b.position === newStart),
          end: overlapping.find(b => b.type === 'close' && b.position === newEnd),
        },
      };
    }
  }

  // Snap start to nearest opening boundary (if close)
  const startBoundary = findNearestBoundary(boundaries, start, 'open');
  const endBoundary = findNearestBoundary(boundaries, end, 'close');

  let adjustedStart = start;
  let adjustedEnd = end;
  let reason: string | undefined;
  const snappedTo: SelectionAdjustment['snappedTo'] = {};

  // Only snap if it improves the selection (avoids splitting tags)
  if (startBoundary && Math.abs(startBoundary.position - start) <= 5) {
    // Check if snapping would avoid splitting a tag
    const wouldSplitOriginal = wouldSplitTag(boundaries, range);
    const wouldSplitSnapped = wouldSplitTag(boundaries, {
      start: startBoundary.position,
      end,
    });

    if (!wouldSplitSnapped && wouldSplitOriginal) {
      adjustedStart = startBoundary.position;
      reason = 'Selection snapped to avoid splitting tag';
      snappedTo.start = startBoundary;
    }
  }

  if (endBoundary && Math.abs(endBoundary.position - end) <= 5) {
    const wouldSplitOriginal = wouldSplitTag(boundaries, {
      start,
      end,
    });
    const wouldSplitSnapped = wouldSplitTag(boundaries, {
      start,
      end: endBoundary.position,
    });

    if (!wouldSplitSnapped && wouldSplitOriginal) {
      adjustedEnd = endBoundary.position;
      if (!reason) reason = 'Selection snapped to avoid splitting tag';
      snappedTo.end = endBoundary;
    }
  }

  // Return adjusted or original selection
  if (adjustedStart !== start || adjustedEnd !== end) {
    return {
      originalRange: range,
      adjustedRange: { start: adjustedStart, end: adjustedEnd },
      reason: reason || 'Selection snapped to nearest tag boundary',
      snappedTo,
    };
  }

  // No adjustment needed
  return {
    originalRange: range,
    adjustedRange: range,
    reason: 'Selection is valid',
  };
}

/**
 * Validate if a selection can have a tag applied
 *
 * Checks:
 * 1. Selection doesn't split existing tags
 * 2. Selection doesn't create overlapping same-type tags
 * 3. Selection is within passage bounds
 *
 * @param passage - The passage containing the selection
 * @param range - Selection range to validate
 * @param tagType - Type of tag to apply
 * @returns Validation result
 */
export function validateSelection(
  passage: Passage,
  range: TextRange,
  tagType: string
): {
  valid: boolean;
  reason?: string;
  adjustment?: SelectionAdjustment;
} {
  const { content } = passage;
  const { start, end } = range;

  // Check bounds
  if (start < 0 || end > content.length || start >= end) {
    return {
      valid: false,
      reason: 'Selection is out of bounds',
    };
  }

  // Check for existing tags of same type in selection
  const existingSameType = passage.tags.filter(
    t => t.type === tagType && t.range.start >= start && t.range.end <= end
  );

  if (existingSameType.length > 0) {
    return {
      valid: false,
      reason: `Selection already contains ${tagType} tag(s)`,
    };
  }

  // Check if selection would split tags
  const boundaries = detectTagBoundaries(passage);
  if (wouldSplitTag(boundaries, range)) {
    // Try to snap to boundaries
    const adjustment = snapToTagBoundaries(passage, range);

    if (adjustment.adjustedRange.start !== start ||
        adjustment.adjustedRange.end !== end) {
      return {
        valid: false,
        reason: 'Selection would split existing tag(s)',
        adjustment,
      };
    }
  }

  return { valid: true };
}

/**
 * Parinfer-like smart selection adjustment
 *
 * Automatically adjusts selection to maintain valid XML structure,
 * similar to how Parinfer maintains balanced parentheses.
 *
 * @param passage - The passage containing the selection
 * @param range - User's selected range
 * @param tagType - Type of tag being applied
 * @returns Adjusted selection with explanation
 */
export function smartSelectionAdjust(
  passage: Passage,
  range: TextRange,
  tagType?: string
): SelectionAdjustment {
  // First, validate the selection
  const validation = tagType
    ? validateSelection(passage, range, tagType)
    : { valid: true };

  if (validation.valid) {
    // Selection is valid, but check if we can improve it
    const boundaries = detectTagBoundaries(passage);

    // Snap to boundaries if it creates a cleaner selection
    const startBoundary = findNearestBoundary(boundaries, range.start, 'open');
    const endBoundary = findNearestBoundary(boundaries, range.end, 'close');

    if (startBoundary && endBoundary) {
      const snapStart = Math.abs(startBoundary.position - range.start) <= 3;
      const snapEnd = Math.abs(endBoundary.position - range.end) <= 3;

      if (snapStart || snapEnd) {
        return {
          originalRange: range,
          adjustedRange: {
            start: snapStart ? startBoundary.position : range.start,
            end: snapEnd ? endBoundary.position : range.end,
          },
          reason: 'Selection snapped to tag boundaries for cleaner markup',
          snappedTo: {
            start: snapStart ? startBoundary : undefined,
            end: snapEnd ? endBoundary : undefined,
          },
        };
      }
    }

    // No adjustment needed
    return {
      originalRange: range,
      adjustedRange: range,
      reason: 'Selection is valid',
    };
  }

  // Selection is invalid, return suggested adjustment
  if (validation.adjustment) {
    return validation.adjustment;
  }

  // Default: try to snap to boundaries
  return snapToTagBoundaries(passage, range);
}
