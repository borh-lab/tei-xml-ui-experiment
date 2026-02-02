import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export interface TEINode {
  [key: string]: any;
}

export interface TextRange {
  start: number;
  end: number;
}

export class TEIDocument {
  private parser: XMLParser;
  public rawXML: string;
  public parsed: TEINode;
  public metadata: any = {};
  public changes: any[] = [];

  constructor(xmlContent: string) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    this.rawXML = xmlContent;
    this.parsed = this.parser.parse(xmlContent);
  }

  serialize(): string {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true
    });
    return builder.build(this.parsed);
  }

  getDivisions(): any[] {
    const divisions: any[] = [];

    function traverse(node: any, depth = 0) {
      if (!node || typeof node !== 'object') return;

      // Check for div elements
      if (Array.isArray(node)) {
        node.forEach(item => traverse(item, depth));
      } else {
        for (const key in node) {
          if (key === 'div') {
            const divs = Array.isArray(node[key]) ? node[key] : [node[key]];
            divs.forEach((div: any) => {
              divisions.push({
                type: div['@_type'],
                n: div['@_n'],
                depth,
                element: div
              });
              traverse(div, depth + 1);
            });
          } else {
            traverse(node[key], depth);
          }
        }
      }
    }

    traverse(this.parsed);
    return divisions;
  }

  getDialogue(): any[] {
    const dialogue: any[] = [];

    function traverse(node: any) {
      if (!node || typeof node !== 'object') return;

      if (Array.isArray(node)) {
        node.forEach(item => traverse(item));
      } else {
        for (const key in node) {
          if (key === 'said') {
            const saids = Array.isArray(node[key]) ? node[key] : [node[key]];
            saids.forEach((said: any) => {
              dialogue.push({
                who: said['@_who'],
                direct: said['@_direct'],
                aloud: said['@_aloud'],
                content: said['#text'] || said,
                element: said
              });
            });
          } else {
            traverse(node[key]);
          }
        }
      }
    }

    traverse(this.parsed);
    return dialogue;
  }
  addSaidTag(passageIndex: number, textRange: TextRange, speakerId: string): void {
    const p = this.parsed.TEI?.text?.body?.p;
    if (!p) return;

    // Handle case where p is a single paragraph (not an array)
    const paragraphs = Array.isArray(p) ? p : [p];
    const passage = paragraphs[passageIndex];
    if (!passage) return;

    const text = typeof passage === 'string' ? passage : passage['#text'] || '';
    const before = text.substring(0, textRange.start);
    const selected = text.substring(textRange.start, textRange.end);
    const after = text.substring(textRange.end);

    const saidElement = {
      '@_who': `#${speakerId}`,
      '#text': selected
    };

    // For proper TEI XML serialization with mixed content,
    // we need to rebuild the passage with the <said> element embedded
    // This creates the structure: <p>before<said who="#speaker1">selected</said>after</p>
    const newPassageContent = before + '___SAID_TAG___' + selected + '___SAID_TAG_END___' + after;

    // Temporarily mark the position and let serialize() handle it properly
    // For now, simpler approach: store as object structure that XMLBuilder understands
    const newPassage: any = {
      'said': [saidElement]
    };

    // Add text before and after
    if (before) {
      newPassage['#text'] = before;
    }
    if (after) {
      // Use a special key for text after the element
      newPassage['#text_2'] = after;
    }

    // Replace passage content
    if (typeof passage === 'string') {
      // If original p was a string, convert to array first
      if (!Array.isArray(this.parsed.TEI.text.body.p)) {
        this.parsed.TEI.text.body.p = [this.parsed.TEI.text.body.p];
      }
      this.parsed.TEI.text.body.p[passageIndex] = newPassage;
    } else {
      // Merge into existing passage structure
      Object.assign(passage, newPassage);
    }
  }

  updateSpeaker(passageIndex: number, dialogueIndex: number, speakerId: string): void {
    const p = this.parsed.TEI?.text?.body?.p;
    if (!p) return;

    const paragraphs = Array.isArray(p) ? p : [p];
    const passage = paragraphs[passageIndex];
    if (!passage) return;

    // Get <said> elements from passage
    let saidElements = passage['said'];
    if (!saidElements) return;

    // Convert to array if single element
    const saidArray = Array.isArray(saidElements) ? saidElements : [saidElements];

    // Update the specified dialogue
    if (saidArray[dialogueIndex]) {
      saidArray[dialogueIndex]['@_who'] = `#${speakerId}`;
    }

    // Restore to passage
    passage['said'] = saidArray.length === 1 ? saidArray[0] : saidArray;
  }

  getCharacters() { return []; }
}
