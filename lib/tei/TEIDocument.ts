import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export interface TEINode {
  [key: string]: any;
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
  getCharacters() { return []; }
}
