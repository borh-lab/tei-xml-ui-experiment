// @ts-nocheck
/**
 * Utility functions for applying TEI tags to text selections
 */

/**
 * Represents a TEI paragraph element
 */
interface TEIParagraph {
  '#text'?: string;
  [key: string]: string | string[] | TEIParagraph | undefined;
}

/**
 * Represents a TEI element with attributes
 */
interface TEIElement {
  [key: string]: string | undefined;
}

/**
 * Extracts text content from a paragraph, handling both string and object formats
 */
export function getParagraphText(para: string | TEIParagraph): string {
  if (typeof para === 'string') {
    return para;
  }

  if (para && typeof para === 'object') {
    // If it's a paragraph with direct text content
    if (para['#text']) {
      return para['#text'];
    }

    // If it's a paragraph with nested elements, concatenate them
    let text = '';
    for (const key in para) {
      if (!key.startsWith('@')) {
        const value = para[key];
        if (typeof value === 'string') {
          text += value;
        } else if (Array.isArray(value)) {
          value.forEach((item: string | TEIParagraph) => {
            if (typeof item === 'string') {
              text += item;
            } else if (item && item['#text']) {
              text += item['#text'];
            }
          });
        } else if (value && typeof value === 'object' && value['#text']) {
          text += value['#text'];
        }
      }
    }
    return text;
  }

  return '';
}

/**
 * Applies a TEI tag to a specific text within a paragraph
 */
export function applyTagToParagraph(
  para: string | TEIParagraph,
  selectedText: string,
  tag: string,
  attrs?: Record<string, string>
): string | TEIParagraph {
  // If paragraph is a simple string, convert to object structure
  if (typeof para === 'string') {
    const index = para.indexOf(selectedText);

    // If text not found, return original
    if (index === -1) {
      console.warn(`Text "${selectedText}" not found in paragraph`);
      return para;
    }

    const before = para.substring(0, index);
    const after = para.substring(index + selectedText.length);

    // Create new tagged element structure
    const taggedElement: TEIElement = {};
    taggedElement[`#${tag}`] = selectedText;

    // Add attributes if provided (convert to fast-xml-parser format)
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        taggedElement[`@_${key}`] = value;
      });
    } else {
      // Add default rend attribute for visual styling
      taggedElement['@_rend'] = 'plain';
    }

    // Return mixed content array: [beforeText, taggedElement, afterText]
    const result: (string | TEIElement)[] = [];
    if (before) result.push(before);
    result.push(taggedElement);
    if (after) result.push(after);

    return result as unknown as TEIParagraph;
  }

  // If paragraph is already an object with structure
  if (typeof para === 'object') {
    // Check if it has #text property (simple paragraph with attributes)
    if (
      para['#text'] &&
      typeof para['#text'] === 'string' &&
      para['#text'].includes(selectedText)
    ) {
      const fullText = para['#text'];
      const index = fullText.indexOf(selectedText);
      const before = fullText.substring(0, index);
      const after = fullText.substring(index + selectedText.length);

      // Create new object with tagged element
      const result: TEIParagraph = {};

      // Copy all existing attributes
      Object.entries(para).forEach(([key, value]) => {
        if (key !== '#text') {
          result[key] = value;
        }
      });

      // Build mixed content
      const content: (string | TEIElement)[] = [];
      if (before) content.push(before);

      const taggedElement: TEIElement = {};
      taggedElement[`#${tag}`] = selectedText;

      // Add attributes
      if (attrs) {
        Object.entries(attrs).forEach(([key, value]) => {
          taggedElement[`@_${key}`] = value;
        });
      } else {
        taggedElement['@_rend'] = 'plain';
      }

      content.push(taggedElement);
      if (after) content.push(after);

      // Set as mixed content (use a key that doesn't conflict with attributes)
      result['#text'] = content as any; // TODO: proper mixed content type

      return result;
    }

    // Handle array-based content (already mixed content)
    const keys = Object.keys(para).filter((k) => !k.startsWith('@'));
    if (keys.length > 0) {
      const contentKey = keys[0];
      const content = para[contentKey];

      if (Array.isArray(content)) {
        // Search through the array for the text
        for (let i = 0; i < content.length; i++) {
          const item = content[i];
          const itemText = typeof item === 'string' ? item : item?.['#text'] || '';

          if (itemText.includes(selectedText)) {
            const before = itemText.substring(0, itemText.indexOf(selectedText));
            const after = itemText.substring(itemText.indexOf(selectedText) + selectedText.length);

            const taggedElement: TEIElement = {};
            taggedElement[`#${tag}`] = selectedText;

            if (attrs) {
              Object.entries(attrs).forEach(([key, value]) => {
                taggedElement[`@_${key}`] = value;
              });
            } else {
              taggedElement['@_rend'] = 'plain';
            }

            // Replace the current item with split content
            const newContent = [...content];
            const replacement: (string | TEIElement)[] = [];

            if (before) replacement.push(before);
            replacement.push(taggedElement);
            if (after) replacement.push(after);

            newContent.splice(i, 1, ...replacement as any); // TODO: proper mixed content type

            // Return updated paragraph
            const result: TEIParagraph = {};
            Object.entries(para).forEach(([key, value]) => {
              if (key === contentKey) {
                result[key] = newContent;
              } else {
                result[key] = value;
              }
            });

            return result;
          }
        }
      }
    }
  }

  // If we couldn't process it, return original
  console.warn('Could not apply tag to paragraph, returning original');
  return para;
}
