export interface TagValue {
  name: string;
  attributes?: Record<string, string>;
}

export interface PassageValue {
  speaker: string;
  text: string;
  tags?: TagValue[];
}

export interface HeaderValue {
  title: string;
  author?: string;
}

export interface TEIDocumentValue {
  header: HeaderValue;
  passages: PassageValue[];
}

export class TEIDocument {
  static valid(options: {
    title: string;
    speakers: string[];
    passages: number;
  }): TEIDocumentValue {
    const passages: PassageValue[] = [];

    for (let i = 0; i < options.passages; i++) {
      const speaker = options.speakers[i % options.speakers.length];
      passages.push({
        speaker,
        text: `Test passage ${i + 1}`,
        tags: [],
      });
    }

    return {
      header: { title: options.title },
      passages,
    };
  }

  static invalid(options: {
    error: 'unclosed-tag' | 'missing-root' | 'malformed';
  }): TEIDocumentValue {
    // Return value that will serialize to invalid XML
    if (options.error === 'unclosed-tag') {
      return {
        header: { title: 'Invalid' },
        passages: [{ speaker: '#test', text: '<unclosed' }],
      };
    }

    if (options.error === 'missing-root') {
      return {
        header: { title: 'Invalid' },
        passages: [{ speaker: '#test', text: 'No root element' }],
      };
    }

    // malformed
    return {
      header: { title: 'Invalid' },
      passages: [{ speaker: '#test', text: '&invalid entity;' }],
    };
  }

  static withPassages(passages: PassageValue[]): TEIDocumentValue {
    return {
      header: { title: 'Custom Document' },
      passages,
    };
  }

  static empty(): TEIDocumentValue {
    return {
      header: { title: 'Empty Document' },
      passages: [],
    };
  }
}
