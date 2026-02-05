/**
 * Tests for RealTimeHints component
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { RealTimeHints } from '@/components/hints/RealTimeHints';
import type { Hint } from '@/lib/values/Hint';
import type { Selection } from '@/lib/values/Selection';

describe('RealTimeHints', () => {
  const mockSelection: Selection = {
    passageId: 'passage-1',
    range: { start: 0, end: 5 },
    text: 'Hello',
    context: 'Hello',
    timestamp: Date.now(),
  };

  const validHint: Hint = {
    severity: 'valid',
    message: 'Ready to apply tag',
    code: 'VALID',
  };

  const warningHint: Hint = {
    severity: 'warning',
    message: 'Consider adding speaker',
    code: 'MISSING_OPTIONAL',
  };

  const invalidHint: Hint = {
    severity: 'invalid',
    message: 'Missing required attribute: who',
    code: 'MISSING_ATTRIBUTE',
  };

  beforeEach(() => {
    // Mock window.getSelection
    const mockRange = {
      getClientRects: () => [
        { left: 100, top: 100, right: 200, bottom: 120, width: 100, height: 20 },
      ],
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
    };

    window.getSelection = jest.fn(() => mockSelection as any);
  });

  it('should render green outline for valid hints', () => {
    const { container } = render(
      <RealTimeHints
        selection={mockSelection}
        activeTagType="said"
        hint={validHint}
        onHintAccepted={jest.fn()}
      />
    );

    const outline = container.querySelector('.realtime-hints-outline');
    expect(outline).toHaveClass('outline-green');
  });

  it('should render yellow outline for warning hints', () => {
    const { container } = render(
      <RealTimeHints
        selection={mockSelection}
        activeTagType="said"
        hint={warningHint}
        onHintAccepted={jest.fn()}
      />
    );

    const outline = container.querySelector('.realtime-hints-outline');
    expect(outline).toHaveClass('outline-yellow');
  });

  it('should render red outline for invalid hints', () => {
    const { container } = render(
      <RealTimeHints
        selection={mockSelection}
        activeTagType="said"
        hint={invalidHint}
        onHintAccepted={jest.fn()}
      />
    );

    const outline = container.querySelector('.realtime-hints-outline');
    expect(outline).toHaveClass('outline-red');
  });

  it('should not render outline when no hint', () => {
    const { container } = render(
      <RealTimeHints
        selection={mockSelection}
        activeTagType="said"
        hint={null}
        onHintAccepted={jest.fn()}
      />
    );

    const outline = container.querySelector('.realtime-hints-outline');
    expect(outline).not.toBeInTheDocument();
  });

  it('should not render outline when no selection', () => {
    const { container } = render(
      <RealTimeHints
        selection={null}
        activeTagType="said"
        hint={validHint}
        onHintAccepted={jest.fn()}
      />
    );

    const outline = container.querySelector('.realtime-hints-outline');
    expect(outline).not.toBeInTheDocument();
  });

  it('should render HintTooltip when hint exists', () => {
    render(
      <RealTimeHints
        selection={mockSelection}
        activeTagType="said"
        hint={validHint}
        onHintAccepted={jest.fn()}
      />
    );

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('should not render HintTooltip when no hint', () => {
    render(
      <RealTimeHints
        selection={mockSelection}
        activeTagType="said"
        hint={null}
        onHintAccepted={jest.fn()}
      />
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should position outline based on selection range', () => {
    const { container } = render(
      <RealTimeHints
        selection={mockSelection}
        activeTagType="said"
        hint={validHint}
        onHintAccepted={jest.fn()}
      />
    );

    const outline = container.querySelector('.realtime-hints-outline');
    expect(outline).toBeInTheDocument();
    expect(outline).toHaveStyle({ left: '100px', top: '100px' });
  });

  it('should call onHintAccepted when action is clicked', () => {
    const hintWithAction: Hint = {
      severity: 'invalid',
      message: 'Missing required attribute: who',
      code: 'MISSING_ATTRIBUTE',
      suggestedAction: {
        type: 'add-attribute',
        label: 'Add who attribute',
        attributes: { who: 'speaker-1' },
      },
    };

    const onHintAccepted = jest.fn();

    render(
      <RealTimeHints
        selection={mockSelection}
        activeTagType="said"
        hint={hintWithAction}
        onHintAccepted={onHintAccepted}
      />
    );

    const actionButton = screen.getByText('Add who attribute');
    act(() => {
      actionButton.click();
    });

    expect(onHintAccepted).toHaveBeenCalledWith(hintWithAction.suggestedAction);
  });

  it('should render with smooth transitions', () => {
    const { container } = render(
      <RealTimeHints
        selection={mockSelection}
        activeTagType="said"
        hint={validHint}
        onHintAccepted={jest.fn()}
      />
    );

    const outline = container.querySelector('.realtime-hints-outline');
    expect(outline).toHaveClass('outline-transition');
  });
});
