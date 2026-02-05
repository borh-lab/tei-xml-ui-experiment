export interface SelectionRange {
  text: string;
  startOffset: number;
  endOffset: number;
  container: Node;
}

/**
 * Extracts the current text selection from the document.
 * Returns null if no selection exists or if the selection is empty.
 */
export function getSelectionRange(): SelectionRange | null {
  const selection = window.getSelection();

  // Check if selection exists and has ranges
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  // Get the first range
  const range = selection.getRangeAt(0);
  const text = range.toString();

  // Return null if no text is selected
  if (!text) {
    return null;
  }

  return {
    text,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    container: range.commonAncestorContainer,
  };
}
