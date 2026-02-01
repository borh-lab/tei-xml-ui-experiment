import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandPalette } from '@/components/keyboard/CommandPalette';
import { DocumentProvider } from '@/lib/context/DocumentContext';
import { ErrorProvider } from '@/lib/context/ErrorContext';

describe('CommandPalette', () => {
  test('should render command palette with all command groups', () => {
    render(
      <ErrorProvider>

      <DocumentProvider>
        <CommandPalette
          open={true}
          onClose={() => {}}
          onToggleBulkMode={() => {}}
          onToggleVisualizations={() => {}}
          isBulkMode={false}
          isVizPanelOpen={false}
        />
      </DocumentProvider>

      </ErrorProvider>
    );

    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument();

    // Document Actions group
    expect(screen.getByText('Document Actions')).toBeInTheDocument();
    expect(screen.getByText('Save document')).toBeInTheDocument();
    expect(screen.getByText('Export TEI XML')).toBeInTheDocument();
    expect(screen.getByText('Export HTML')).toBeInTheDocument();
    expect(screen.getByText('Clear document')).toBeInTheDocument();

    // View Options group
    expect(screen.getByText('View Options')).toBeInTheDocument();
    expect(screen.getByText('Toggle bulk mode')).toBeInTheDocument();
    expect(screen.getByText('Toggle visualizations')).toBeInTheDocument();

    // Load Sample group
    expect(screen.getByText('Load Sample')).toBeInTheDocument();
    expect(screen.getByText('The Yellow Wallpaper')).toBeInTheDocument();
    expect(screen.getByText('The Gift of the Magi')).toBeInTheDocument();
    expect(screen.getByText('The Tell-Tale Heart')).toBeInTheDocument();
  });

  test('should show keyboard shortcuts for commands', () => {
    render(
      <ErrorProvider>

      <DocumentProvider>
        <CommandPalette
          open={true}
          onClose={() => {}}
          onToggleBulkMode={() => {}}
          onToggleVisualizations={() => {}}
          isBulkMode={false}
          isVizPanelOpen={false}
        />
      </DocumentProvider>

      </ErrorProvider>
    );

    // Check for keyboard shortcut hints
    expect(screen.getByText('⌘S')).toBeInTheDocument(); // Save document shortcut
    expect(screen.getByText('⌘B')).toBeInTheDocument(); // Bulk mode shortcut
  });

  test('should show status indicators for active features', () => {
    render(
      <ErrorProvider>

      <DocumentProvider>
        <CommandPalette
          open={true}
          onClose={() => {}}
          onToggleBulkMode={() => {}}
          onToggleVisualizations={() => {}}
          isBulkMode={true}
          isVizPanelOpen={true}
        />
      </DocumentProvider>

      </ErrorProvider>
    );

    // Should show "Active" badge for bulk mode
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThan(0);

    // Should show "Visible" badge for visualizations
    const visibleBadges = screen.getAllByText('Visible');
    expect(visibleBadges.length).toBeGreaterThan(0);
  });

  test('should disable commands when no document is loaded', () => {
    render(
      <ErrorProvider>

      <DocumentProvider>
        <CommandPalette
          open={true}
          onClose={() => {}}
          onToggleBulkMode={() => {}}
          onToggleVisualizations={() => {}}
          isBulkMode={false}
          isVizPanelOpen={false}
        />
      </DocumentProvider>

      </ErrorProvider>
    );

    // All document-related commands should show "(No doc)" indicator
    const noDocIndicators = screen.getAllByText('(No doc)');
    expect(noDocIndicators.length).toBeGreaterThan(0);
  });

  test('should show sample metadata', () => {
    render(
      <ErrorProvider>

      <DocumentProvider>
        <CommandPalette
          open={true}
          onClose={() => {}}
          onToggleBulkMode={() => {}}
          onToggleVisualizations={() => {}}
          isBulkMode={false}
          isVizPanelOpen={false}
        />
      </DocumentProvider>

      </ErrorProvider>
    );

    // Check that sample titles are displayed
    expect(screen.getByText('The Yellow Wallpaper')).toBeInTheDocument();
    expect(screen.getByText('The Gift of the Magi')).toBeInTheDocument();
    expect(screen.getByText('The Tell-Tale Heart')).toBeInTheDocument();

    // Check that metadata sections contain author names
    expect(screen.getByText(/Charlotte Perkins Gilman/)).toBeInTheDocument();
    expect(screen.getByText(/O\. Henry/)).toBeInTheDocument();
    expect(screen.getByText(/Edgar Allan Poe/)).toBeInTheDocument();

    // Check difficulty levels (using getAllByText since multiple samples can have same difficulty)
    const intermediateBadges = screen.getAllByText(/intermediate/);
    expect(intermediateBadges.length).toBeGreaterThan(0);

    const advancedBadges = screen.getAllByText(/advanced/);
    expect(advancedBadges.length).toBeGreaterThan(0);
  });
});
