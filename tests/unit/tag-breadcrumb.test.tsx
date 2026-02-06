// @ts-nocheck
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { TagBreadcrumb } from '@/components/editor/TagBreadcrumb';
import { DocumentProvider } from '@/lib/context/DocumentContext';
import { loadDocument } from '@/lib/tei/operations';

describe('TagBreadcrumb (Effect-based)', () => {
  it('should render nothing when no tag is selected', () => {
    const sampleTEI = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(sampleTEI);

    const { container } = render(
      <DocumentProvider document={doc}>
        <TagBreadcrumb />
      </DocumentProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render without props', () => {
    const sampleTEI = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(sampleTEI);

    const { container } = render(
      <DocumentProvider document={doc}>
        <TagBreadcrumb />
      </DocumentProvider>
    );
    // No tag selected, should render nothing
    expect(container.firstChild).toBeNull();
  });

  // Note: The new Effect-based implementation doesn't use DOM event listeners
  // It gets state from useDocumentService hook. Tests for full functionality
  // would require mocking the Effect service layer, which is tested separately
  // in lib/effect/__tests__/ directory.
});
