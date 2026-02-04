import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineSuggestions, InlineSuggestionItem } from '@/components/ai/InlineSuggestions';
import { DialogueSpan } from '@/lib/ai/providers';

describe('InlineSuggestions', () => {
  const mockSuggestions: DialogueSpan[] = [
    {
      start: 0,
      end: 20,
      text: 'Hello, how are you?',
      confidence: 0.85,
    },
    {
      start: 25,
      end: 40,
      text: 'I am doing well',
      confidence: 0.65,
    },
    {
      start: 45,
      end: 55,
      text: 'That is good',
      confidence: 0.45,
    },
  ];

  describe('rendering', () => {
    test('should render empty state when no suggestions', () => {
      const { container } = render(
        <InlineSuggestions suggestions={[]} onAccept={jest.fn()} onReject={jest.fn()} />
      );

      expect(container.firstChild).toBeNull();
    });

    test('should render list of suggestions', () => {
      render(
        <InlineSuggestions
          suggestions={mockSuggestions}
          onAccept={jest.fn()}
          onReject={jest.fn()}
        />
      );

      // Check that all suggestions are rendered
      expect(screen.getByText('"Hello, how are you?"')).toBeInTheDocument();
      expect(screen.getByText('"I am doing well"')).toBeInTheDocument();
      expect(screen.getByText('"That is good"')).toBeInTheDocument();
    });

    test('should display confidence scores as percentages', () => {
      render(
        <InlineSuggestions
          suggestions={mockSuggestions}
          onAccept={jest.fn()}
          onReject={jest.fn()}
        />
      );

      expect(screen.getByText('85% High')).toBeInTheDocument();
      expect(screen.getByText('65% Medium')).toBeInTheDocument();
      expect(screen.getByText('45% Low')).toBeInTheDocument();
    });

    test('should show accept and reject buttons for each suggestion', () => {
      render(
        <InlineSuggestions
          suggestions={mockSuggestions}
          onAccept={jest.fn()}
          onReject={jest.fn()}
        />
      );

      // Should have 3 accept and 3 reject buttons (one per suggestion)
      const acceptButtons = screen.getAllByTitle(/Accept/);
      const rejectButtons = screen.getAllByTitle(/Reject/);

      expect(acceptButtons).toHaveLength(3);
      expect(rejectButtons).toHaveLength(3);
    });

    test('should apply appropriate color coding based on confidence', () => {
      const { container } = render(
        <InlineSuggestions
          suggestions={mockSuggestions}
          onAccept={jest.fn()}
          onReject={jest.fn()}
        />
      );

      // Check for high confidence badge (green)
      const highBadge = screen.getByText('85% High');
      expect(highBadge).toHaveClass('bg-green-100');

      // Check for medium confidence badge (yellow)
      const mediumBadge = screen.getByText('65% Medium');
      expect(mediumBadge).toHaveClass('bg-yellow-100');

      // Check for low confidence badge (red)
      const lowBadge = screen.getByText('45% Low');
      expect(lowBadge).toHaveClass('bg-red-100');
    });

    test('should show matched selection indicator when text matches', () => {
      render(
        <InlineSuggestions
          suggestions={mockSuggestions}
          onAccept={jest.fn()}
          onReject={jest.fn()}
          highlightedText="how are you"
        />
      );

      expect(screen.getByText('Matched selection')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    test('should call onAccept with correct suggestion when accept button clicked', async () => {
      const user = userEvent.setup();
      const onAccept = jest.fn();

      render(
        <InlineSuggestions suggestions={mockSuggestions} onAccept={onAccept} onReject={jest.fn()} />
      );

      const acceptButtons = screen.getAllByTitle(/Accept/);
      await user.click(acceptButtons[0]);

      expect(onAccept).toHaveBeenCalledTimes(1);
      expect(onAccept).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    test('should call onReject with correct suggestion when reject button clicked', async () => {
      const user = userEvent.setup();
      const onReject = jest.fn();

      render(
        <InlineSuggestions suggestions={mockSuggestions} onReject={onReject} onAccept={jest.fn()} />
      );

      const rejectButtons = screen.getAllByTitle(/Reject/);
      await user.click(rejectButtons[1]);

      expect(onReject).toHaveBeenCalledTimes(1);
      expect(onReject).toHaveBeenCalledWith(mockSuggestions[1]);
    });

    test('should handle multiple accept/reject actions independently', async () => {
      const user = userEvent.setup();
      const onAccept = jest.fn();
      const onReject = jest.fn();

      render(
        <InlineSuggestions suggestions={mockSuggestions} onAccept={onAccept} onReject={onReject} />
      );

      const acceptButtons = screen.getAllByTitle(/Accept/);
      const rejectButtons = screen.getAllByTitle(/Reject/);

      // Accept first suggestion
      await user.click(acceptButtons[0]);
      expect(onAccept).toHaveBeenCalledWith(mockSuggestions[0]);

      // Reject second suggestion
      await user.click(rejectButtons[1]);
      expect(onReject).toHaveBeenCalledWith(mockSuggestions[1]);

      // Accept third suggestion
      await user.click(acceptButtons[2]);
      expect(onAccept).toHaveBeenCalledWith(mockSuggestions[2]);

      expect(onAccept).toHaveBeenCalledTimes(2);
      expect(onReject).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <InlineSuggestions
          suggestions={mockSuggestions}
          onAccept={jest.fn()}
          onReject={jest.fn()}
        />
      );

      const list = screen.getByRole('list', { name: /AI suggestions/i });
      expect(list).toBeInTheDocument();

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });

    test('should have accessible button labels', () => {
      render(
        <InlineSuggestions
          suggestions={mockSuggestions}
          onAccept={jest.fn()}
          onReject={jest.fn()}
        />
      );

      const acceptButtons = screen.getAllByTitle(/Accept/);
      const rejectButtons = screen.getAllByTitle(/Reject/);

      acceptButtons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });

      rejectButtons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    test('should include keyboard shortcuts in button titles', () => {
      render(
        <InlineSuggestions
          suggestions={mockSuggestions}
          onAccept={jest.fn()}
          onReject={jest.fn()}
        />
      );

      const acceptButtons = screen.getAllByTitle(/Accept/);
      const rejectButtons = screen.getAllByTitle(/Reject/);

      acceptButtons.forEach((button) => {
        expect(button).toHaveAttribute('title', expect.stringContaining('(A)'));
      });

      rejectButtons.forEach((button) => {
        expect(button).toHaveAttribute('title', expect.stringContaining('(X)'));
      });
    });
  });
});

describe('Performance Optimization', () => {
  test('should not re-render when props unchanged', () => {
    const mockSuggestions: DialogueSpan[] = [
      {
        start: 0,
        end: 20,
        text: 'Hello, how are you?',
        confidence: 0.85,
      },
    ];

    const { rerender } = render(
      <InlineSuggestions suggestions={mockSuggestions} onAccept={jest.fn()} onReject={jest.fn()} />
    );

    // Re-render with same props - should not cause issues
    rerender(
      <InlineSuggestions suggestions={mockSuggestions} onAccept={jest.fn()} onReject={jest.fn()} />
    );

    // Component should still render correctly
    expect(screen.getByText('"Hello, how are you?"')).toBeInTheDocument();
  });

  test('should re-render when suggestions change', () => {
    const mockSuggestions1: DialogueSpan[] = [
      {
        start: 0,
        end: 20,
        text: 'First suggestion',
        confidence: 0.85,
      },
    ];

    const mockSuggestions2: DialogueSpan[] = [
      {
        start: 0,
        end: 20,
        text: 'Second suggestion',
        confidence: 0.85,
      },
    ];

    const { rerender } = render(
      <InlineSuggestions suggestions={mockSuggestions1} onAccept={jest.fn()} onReject={jest.fn()} />
    );

    expect(screen.getByText('"First suggestion"')).toBeInTheDocument();

    rerender(
      <InlineSuggestions suggestions={mockSuggestions2} onAccept={jest.fn()} onReject={jest.fn()} />
    );

    // Should update with new suggestion
    expect(screen.getByText('"Second suggestion"')).toBeInTheDocument();
    expect(screen.queryByText('"First suggestion"')).not.toBeInTheDocument();
  });
});

describe('InlineSuggestionItem', () => {
  const mockSuggestion: DialogueSpan = {
    start: 0,
    end: 20,
    text: 'Hello, world!',
    confidence: 0.9,
  };

  test('should render suggestion item with full text by default', () => {
    render(
      <InlineSuggestionItem suggestion={mockSuggestion} onAccept={jest.fn()} onReject={jest.fn()} />
    );

    expect(screen.getByText('"Hello, world!"')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  test('should hide text when showFullText is false', () => {
    render(
      <InlineSuggestionItem
        suggestion={mockSuggestion}
        onAccept={jest.fn()}
        onReject={jest.fn()}
        showFullText={false}
      />
    );

    expect(screen.queryByText('"Hello, world!"')).not.toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  test('should call onAccept when accept button is clicked', async () => {
    const user = userEvent.setup();
    const onAccept = jest.fn();

    render(
      <InlineSuggestionItem suggestion={mockSuggestion} onAccept={onAccept} onReject={jest.fn()} />
    );

    const acceptButton = screen.getByTitle('Accept (A)');
    await user.click(acceptButton);

    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  test('should call onReject when reject button is clicked', async () => {
    const user = userEvent.setup();
    const onReject = jest.fn();

    render(
      <InlineSuggestionItem suggestion={mockSuggestion} onAccept={jest.fn()} onReject={onReject} />
    );

    const rejectButton = screen.getByTitle('Reject (X)');
    await user.click(rejectButton);

    expect(onReject).toHaveBeenCalledTimes(1);
  });

  test('should display high confidence with green color', () => {
    const highConfidenceSuggestion: DialogueSpan = {
      ...mockSuggestion,
      confidence: 0.85,
    };

    const { container } = render(
      <InlineSuggestionItem
        suggestion={highConfidenceSuggestion}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );

    const badge = screen.getByText('85%');
    expect(badge).toHaveClass('bg-green-100');
  });

  test('should display medium confidence with yellow color', () => {
    const mediumConfidenceSuggestion: DialogueSpan = {
      ...mockSuggestion,
      confidence: 0.65,
    };

    render(
      <InlineSuggestionItem
        suggestion={mediumConfidenceSuggestion}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );

    const badge = screen.getByText('65%');
    expect(badge).toHaveClass('bg-yellow-100');
  });

  test('should display low confidence with red color', () => {
    const lowConfidenceSuggestion: DialogueSpan = {
      ...mockSuggestion,
      confidence: 0.45,
    };

    render(
      <InlineSuggestionItem
        suggestion={lowConfidenceSuggestion}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );

    const badge = screen.getByText('45%');
    expect(badge).toHaveClass('bg-red-100');
  });
});
