import { XMLParser } from 'fast-xml-parser';

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
    return this.rawXML;
  }

  getDivisions() { return []; }
  getDialogue() { return []; }
  getCharacters() { return []; }
}
