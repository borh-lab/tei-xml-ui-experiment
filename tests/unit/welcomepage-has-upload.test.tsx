import { render, screen } from '@testing-library/react';
import Home from '@/app/page';
import { DocumentProvider } from '@/lib/context/DocumentContext';
import { ErrorProvider } from '@/lib/context/ErrorContext';

describe('WelcomePage - FileUpload', () => {
  it('should render "Upload TEI File" button', () => {
    render(
      <ErrorProvider>
        <DocumentProvider>
          <Home />
        </DocumentProvider>
      </ErrorProvider>
    );

    const uploadButton = screen.getByRole('button', { name: /upload tei file/i });
    expect(uploadButton).toBeInTheDocument();
  });
});
