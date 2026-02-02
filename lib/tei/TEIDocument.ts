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

  getCharacters(): any[] {
    const standOff = this.parsed.TEI?.standOff;
    if (!standOff) return [];

    const listPerson = standOff['listPerson'];
    if (!listPerson) return [];

    const persons = listPerson['person'];
    if (!persons) return [];

    const personArray = Array.isArray(persons) ? persons : [persons];

    return personArray.map((person: any) => ({
      'xml:id': person['@_xml:id'] || person['xml:id'],
      persName: person['persName']?.['#text'] || person['persName'],
      sex: person['sex']?.['@_value'],
      age: person['age']?.['@_value'] ? parseInt(person['age']['@_value']) : undefined,
      occupation: person['occupation']?.['#text'] || person['occupation'],
      role: person['role']?.['@_type'] || person['role'],
      traits: person['trait'] ? (Array.isArray(person['trait']) ? person['trait'].map((t: any) => t['@_type'] || t) : [person['trait']]) : [],
      socialStatus: person['socecStatus']?.['#text'],
      maritalStatus: person['state']?.find((s: any) => s['@_type'] === 'marital')?.['@_value'],
      element: person
    }));
  }

  addCharacter(character: any): void {
    // Ensure <standOff> exists
    if (!this.parsed.TEI.standOff) {
      this.parsed.TEI.standOff = {};
    }

    // Ensure <listPerson> exists
    if (!this.parsed.TEI.standOff.listPerson) {
      this.parsed.TEI.standOff.listPerson = {};
    }

    // Build <person> element
    const personElement: any = {
      '@_xml:id': character['xml:id'],
      'persName': character.persName
    };

    if (character.sex) {
      personElement['sex'] = { '@_value': character.sex };
    }

    if (character.age) {
      personElement['age'] = { '@_value': character.age.toString() };
    }

    if (character.occupation) {
      personElement['occupation'] = { '#text': character.occupation };
    }

    if (character.role) {
      personElement['role'] = { '@_type': character.role };
    }

    if (character.traits && character.traits.length > 0) {
      personElement['trait'] = character.traits.map((t: string) => ({
        '@_type': 'personality',
        '#text': t
      }));
    }

    // Add to listPerson
    const listPerson = this.parsed.TEI.standOff.listPerson;
    if (!listPerson.person) {
      listPerson.person = personElement;
    } else {
      // Convert to array if needed
      const persons = Array.isArray(listPerson.person) ? listPerson.person : [listPerson.person];
      persons.push(personElement);
      listPerson.person = persons;
    }
  }

  getRelationships(): any[] {
    const standOff = this.parsed.TEI?.standOff;
    if (!standOff) return [];

    const listRelation = standOff['listRelation'];
    if (!listRelation) return [];

    const relations = listRelation['relation'];
    if (!relations) return [];

    const relationArray = Array.isArray(relations) ? relations : [relations];

    return relationArray.map((rel: any) => ({
      id: rel['@_xml:id'] || `${rel['@_name']}-${rel['@_active']}-${rel['@_passive']}`,
      from: rel['@_active']?.replace('#', ''),
      to: rel['@_passive']?.replace('#', ''),
      type: rel['@_name'],
      subtype: rel['@_subtype'],
      mutual: rel['@_mutual'] !== 'false',
      element: rel
    }));
  }

  addRelation(relation: any): void {
    // Ensure <standOff> exists
    if (!this.parsed.TEI.standOff) {
      this.parsed.TEI.standOff = {};
    }

    // Ensure <listRelation> exists
    if (!this.parsed.TEI.standOff.listRelation) {
      this.parsed.TEI.standOff.listRelation = {};
    }

    const relationElement: any = {
      '@_name': relation.type,
      '@_active': `#${relation.from}`,
      '@_passive': `#${relation.to}`
    };

    if (relation.subtype) {
      relationElement['@_subtype'] = relation.subtype;
    }

    if (relation.mutual === false) {
      relationElement['@_mutual'] = 'false';
    }

    if (relation.id) {
      relationElement['@_xml:id'] = relation.id;
    }

    const listRelation = this.parsed.TEI.standOff.listRelation;
    if (!listRelation.relation) {
      listRelation.relation = relationElement;
    } else {
      const relations = Array.isArray(listRelation.relation) ? listRelation.relation : [listRelation.relation];
      relations.push(relationElement);
      listRelation.relation = relations;
    }
  }

  removeRelation(fromId: string, toId: string, type: string): void {
    const standOff = this.parsed.TEI?.standOff;
    if (!standOff?.listRelation) return;

    const relations = standOff.listRelation.relation;
    if (!relations) return;

    const relationArray = Array.isArray(relations) ? relations : [relations];

    const filtered = relationArray.filter((rel: any) => {
      const active = rel['@_active']?.replace('#', '');
      const passive = rel['@_passive']?.replace('#', '');
      const name = rel['@_name'];

      return !(active === fromId && passive === toId && name === type);
    });

    standOff.listRelation.relation = filtered.length === 0 ? undefined : (filtered.length === 1 ? filtered[0] : filtered);
  }

  getNamedEntities(): any[] {
    const standOff = this.parsed.TEI?.standOff;
    if (!standOff) return [];

    const listAnnotation = standOff['listAnnotation'];
    if (!listAnnotation) return [];

    const annotations = listAnnotation['annotation'];
    if (!annotations) return [];

    const annotationArray = Array.isArray(annotations) ? annotations : [annotations];

    return annotationArray.map((ann: any) => {
      const entity = ann['persName'] || ann['placeName'] || ann['orgName'] || ann['date'];
      return {
        id: ann['@_xml:id'],
        type: ann['persName'] ? 'persName' : ann['placeName'] ? 'placeName' : ann['orgName'] ? 'orgName' : 'date',
        text: entity?.['#text'] || entity,
        ref: entity?.['@_ref'],
        passageIndex: 0, // TODO: parse from @span
        span: { start: 0, end: 0 }, // TODO: parse from @span
        element: ann
      };
    });
  }

  addNERTag(span: { start: number; end: number }, type: 'persName' | 'placeName' | 'orgName' | 'date', ref?: string): void {
    // Ensure <standOff> exists
    if (!this.parsed.TEI.standOff) {
      this.parsed.TEI.standOff = {};
    }

    // Ensure <listAnnotation> exists
    if (!this.parsed.TEI.standOff.listAnnotation) {
      this.parsed.TEI.standOff.listAnnotation = {};
    }

    const annotationId = `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const annotationElement: any = {
      '@_xml:id': annotationId
    };

    // Add entity element based on type
    const entityElement: any = {};
    if (ref) {
      entityElement['@_ref'] = `#${ref}`;
    }

    annotationElement[type] = entityElement;

    const listAnnotation = this.parsed.TEI.standOff.listAnnotation;
    if (!listAnnotation.annotation) {
      listAnnotation.annotation = annotationElement;
    } else {
      const annotations = Array.isArray(listAnnotation.annotation) ? listAnnotation.annotation : [listAnnotation.annotation];
      annotations.push(annotationElement);
      listAnnotation.annotation = annotations;
    }
  }
}
