import { render, screen } from '@testing-library/react';
import Home from '@/app/page';
import { DocumentProvider } from '@/lib/context/DocumentContext';

describe('WelcomePage - FileUpload', () => {
  it('should render "Upload TEI File" button', () => {
    render(
      <DocumentProvider>
        <Home />
      </DocumentProvider>
    );

    const uploadButton = screen.getByRole('button', { name: /upload tei file/i });
    expect(uploadButton).toBeInTheDocument();
  });
});
