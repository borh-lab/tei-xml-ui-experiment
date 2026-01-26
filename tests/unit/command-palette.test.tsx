import { render, screen } from '@testing-library/react';
import { CommandPalette } from '@/components/keyboard/CommandPalette';
import { DocumentProvider } from '@/lib/context/DocumentContext';

describe('CommandPalette', () => {
  test('should render command palette', () => {
    render(
      <DocumentProvider>
        <CommandPalette open={true} onClose={() => {}} />
      </DocumentProvider>
    );

    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument();
    expect(screen.getByText('Save document')).toBeInTheDocument();
  });
});
