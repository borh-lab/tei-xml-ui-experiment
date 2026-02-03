/**
 * DOM Tag Hierarchy Utilities
 *
 * Functions for inspecting the DOM to find nested tag elements.
 * This is separate from selection management - it's about UI presentation.
 */

export interface DOMTagInfo {
  tagName: string;
  element: HTMLElement;
  attributes: Record<string, string>;
}

/**
 * Get hierarchy of nested TEI tags from a DOM element
 * Traverses up the DOM tree to find all data-tag elements
 */
export function getTagHierarchyFromElement(element: HTMLElement): DOMTagInfo[] {
  const hierarchy: DOMTagInfo[] = [];
  let current: HTMLElement | null = element;

  // Walk up the DOM tree to find all nested tags
  while (current) {
    if (current.hasAttribute('data-tag')) {
      const tagName = current.getAttribute('data-tag');
      if (tagName) {
        const attributes: Record<string, string> = {};

        // Extract data-* attributes (excluding data-tag and data-tag-id)
        for (let i = 0; i < current.attributes.length; i++) {
          const attr = current.attributes[i];
          if (attr.name.startsWith('data-') && attr.name !== 'data-tag' && attr.name !== 'data-tag-id') {
            const attrName = attr.name.replace('data-', '');
            attributes[attrName] = attr.value;
          }
        }

        hierarchy.unshift({
          tagName,
          element: current,
          attributes,
        });
      }
    }

    // Move to parent element, but stop at passage boundary
    if (current.hasAttribute('data-passage-id')) {
      break;
    }
    current = current.parentElement;
  }

  return hierarchy;
}

/**
 * Get tag hierarchy from current DOM selection
 */
export function getTagHierarchyFromSelection(): DOMTagInfo[] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return [];
  }

  const range = selection.getRangeAt(0);
  let element: HTMLElement | null = range.commonAncestorContainer as HTMLElement;

  // If we're in a text node, get the parent element
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement;
  }

  if (!element) {
    return [];
  }

  return getTagHierarchyFromElement(element);
}

/**
 * Get tag hierarchy from a click event target
 */
export function getTagHierarchyFromClick(event?: MouseEvent): DOMTagInfo[] {
  if (!event) {
    return [];
  }

  const target = event.target as HTMLElement | null;
  if (!target || !(target instanceof HTMLElement)) {
    return [];
  }

  return getTagHierarchyFromElement(target);
}
