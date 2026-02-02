export interface SelectionRange {
  text: string;
  startOffset: number;
  endOffset: number;
  passageId: string;
  container: Node;
}

export interface TagInfo {
  tagName: string;
  attributes: Record<string, string>;
  element: HTMLElement;
}

export class SelectionManager {
  private cachedSelection: SelectionRange | null = null;

  /**
   * Capture current text selection with passage tracking
   */
  captureSelection(): SelectionRange | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const text = range.toString();

    if (!text || text.trim().length === 0) {
      return null;
    }

    // Find passage container
    const passageElement = this.findPassageElement(range.commonAncestorContainer);
    if (!passageElement) {
      return null;
    }

    const passageId = passageElement.getAttribute('data-passage-id') || 'passage-0';
    const offsets = this.calculateOffsets(passageElement, range);

    this.cachedSelection = {
      text,
      startOffset: offsets.start,
      endOffset: offsets.end,
      passageId,
      container: range.commonAncestorContainer
    };

    return this.cachedSelection;
  }

  /**
   * Calculate character offsets within a passage element
   */
  private calculateOffsets(passageElement: HTMLElement, range: Range): { start: number; end: number } {
    const rangeClone = range.cloneRange();
    const textRange = document.createRange();
    textRange.selectNodeContents(passageElement);
    textRange.setEnd(rangeClone.startContainer, rangeClone.startOffset);
    const start = textRange.toString().length;

    textRange.setEnd(rangeClone.endContainer, rangeClone.endOffset);
    const end = textRange.toString().length;

    return { start, end };
  }

  /**
   * Find the passage element containing a node
   */
  private findPassageElement(node: Node): HTMLElement | null {
    let current: Node | null = node;
    while (current) {
      if (current instanceof HTMLElement) {
        if (current.getAttribute('data-passage-id')) {
          return current;
        }
      }
      current = current.parentNode;
    }
    return null;
  }

  /**
   * Restore selection at given offsets
   */
  restoreSelection(offsets: { start: number; end: number; passageId: string }): void {
    const passageElement = document.querySelector(`[data-passage-id="${offsets.passageId}"]`) as HTMLElement;
    if (!passageElement) {
      return;
    }

    const textContent = passageElement.textContent || '';
    const start = Math.max(0, Math.min(offsets.start, textContent.length));
    const end = Math.max(start, Math.min(offsets.end, textContent.length));

    // Find text node and offsets
    this.setSelectionInNode(passageElement, start, end);
  }

  /**
   * Set selection within a node at character offsets
   */
  private setSelectionInNode(node: Node, start: number, end: number): void {
    const range = document.createRange();
    const selection = window.getSelection()!;

    let currentOffset = 0;
    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;

    const traverse = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const length = node.textContent?.length || 0;

        if (!startNode && currentOffset + length >= start) {
          startNode = node;
          startOffset = start - currentOffset;
        }

        if (!endNode && currentOffset + length >= end) {
          endNode = node;
          endOffset = end - currentOffset;
          return true; // Stop traversal
        }

        currentOffset += length;
      }

      for (const child of Array.from(node.childNodes || [])) {
        if (traverse(child)) return true;
      }
      return false;
    };

    traverse(node);

    if (startNode && endNode) {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  /**
   * Get information about the tag containing the selection
   */
  getContainingTag(): TagInfo | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    let container: Node | null = range.commonAncestorContainer;

    // If we selected text, start with the parent element
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    while (container instanceof HTMLElement) {
      const tagName = container.getAttribute('data-tag');
      if (tagName) {
        const attributes: Record<string, string> = {};
        for (let i = 0; i < container.attributes.length; i++) {
          const attr = container.attributes[i];
          // Extract all data-* attributes except data-tag and data-passage-id
          if (attr.name.startsWith('data-') &&
              attr.name !== 'data-tag' &&
              attr.name !== 'data-passage-id') {
            const attrName = attr.name.replace('data-', '');
            attributes[attrName] = attr.value;
          }
        }
        return { tagName, attributes, element: container };
      }
      container = container.parentElement;
    }

    return null;
  }

  /**
   * Get the last cached selection
   */
  getCachedSelection(): SelectionRange | null {
    return this.cachedSelection;
  }

  /**
   * Clear the cached selection
   */
  clearCache(): void {
    this.cachedSelection = null;
  }
}
