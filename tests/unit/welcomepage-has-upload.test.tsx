// @ts-nocheck
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';
import { DocumentProvider, useDocumentContext } from '@/lib/context/DocumentContext';
import { ErrorProvider } from '@/lib/context/ErrorContext';

describe('WelcomePage - FileUpload', () => {
  it('should render welcome screen when no document is loaded', () => {
    render(
      <ErrorProvider>
        <DocumentProvider>
          <Home />
        </DocumentProvider>
      </ErrorProvider>
    );

    // The welcome screen shows SampleGallery, which displays "Welcome to TEI Dialogue Editor"
    const welcomeText = screen.getByText(/Welcome to TEI Dialogue Editor/i);
    expect(welcomeText).toBeInTheDocument();
  });

  it('should render FileUpload component', () => {
    // The FileUpload component should exist in the component tree
    // It's rendered by page.tsx when a document is loaded
    // This test just verifies the component can be imported and used
    const { FileUpload } = require('@/components/editor/FileUpload');
    expect(FileUpload).toBeDefined();
  });
});
