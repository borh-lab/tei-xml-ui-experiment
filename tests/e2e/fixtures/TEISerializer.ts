import { TEIDocumentValue } from './TEIDocument';

export class TEISerializer {
  static serialize(doc: TEIDocumentValue): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    xml += '  <teiHeader>\n';
    xml += '    <fileDesc>\n';
    xml += '      <titleStmt>\n';
    xml += `        <title>${this.escapeXml(doc.header.title)}</title>\n`;
    if (doc.header.author) {
      xml += `        <author>${this.escapeXml(doc.header.author)}</author>\n`;
    }
    xml += '      </titleStmt>\n';
    xml += '    </fileDesc>\n';
    xml += '  </teiHeader>\n';
    xml += '  <text>\n';
    xml += '    <body>\n';

    // Add cast list for speakers
    const speakers = new Set<string>();
    doc.passages.forEach(p => speakers.add(p.speaker));

    if (speakers.size > 0) {
      xml += '      <castList>\n';
      speakers.forEach(speaker => {
        xml += `        <castItem><role xml:id="${speaker}">${speaker}</role></castItem>\n`;
      });
      xml += '      </castList>\n';
    }

    // Add passages
    doc.passages.forEach(passage => {
      xml += '      <p>\n';
      xml += `        <s who="${passage.speaker}">${this.escapeXml(passage.text)}</s>\n`;
      xml += '      </p>\n';
    });

    xml += '    </body>\n';
    xml += '  </text>\n';
    xml += '</TEI>\n';

    return xml;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static deserialize(xml: string): TEIDocumentValue {
    // Basic XML parsing - in production, use a proper XML parser
    const titleMatch = xml.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'Untitled';

    const passages: PassageValue[] = [];
    const passageRegex = /<s\s+who="([^"]+)">(.*?)<\/s>/g;
    let match;

    while ((match = passageRegex.exec(xml)) !== null) {
      passages.push({
        speaker: match[1],
        text: this.unescapeXml(match[2]),
        tags: [],
      });
    }

    return {
      header: { title },
      passages,
    };
  }

  private static unescapeXml(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
}
