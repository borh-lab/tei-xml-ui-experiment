/**
 * Tests for HintTooltip component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HintTooltip } from '@/components/hints/HintTooltip';
import type { Hint } from '@/lib/values/Hint';

describe('HintTooltip', () => {
  const mockPosition = { x: 100, y: 100 };

  it('should render hint message', () => {
    const hint: Hint = {
      severity: 'valid',
      message: 'Ready to apply tag',
      code: 'VALID',
    };

    render(<HintTooltip hint={hint} position={mockPosition} visible />);

    expect(screen.getByText('Ready to apply tag')).toBeInTheDocument();
  });

  it('should render severity icon for valid hints', () => {
    const hint: Hint = {
      severity: 'valid',
      message: 'Ready to apply tag',
      code: 'VALID',
    };

    render(<HintTooltip hint={hint} position={mockPosition} visible />);

    // Check for checkmark icon or valid class
    const tooltip = screen.getByText('Ready to apply tag').closest('.hint-tooltip');
    expect(tooltip).toHaveClass('hint-valid');
  });

  it('should render severity icon for warning hints', () => {
    const hint: Hint = {
      severity: 'warning',
      message: 'Consider adding speaker attribute',
      code: 'MISSING_OPTIONAL',
    };

    render(<HintTooltip hint={hint} position={mockPosition} visible />);

    const tooltip = screen.getByText('Consider adding speaker attribute').closest('.hint-tooltip');
    expect(tooltip).toHaveClass('hint-warning');
  });

  it('should render severity icon for invalid hints', () => {
    const hint: Hint = {
      severity: 'invalid',
      message: 'Missing required attribute: who',
      code: 'MISSING_ATTRIBUTE',
    };

    render(<HintTooltip hint={hint} position={mockPosition} visible />);

    const tooltip = screen.getByText('Missing required attribute: who').closest('.hint-tooltip');
    expect(tooltip).toHaveClass('hint-invalid');
  });

  it('should render action button when hint has suggested action', () => {
    const hint: Hint = {
      severity: 'invalid',
      message: 'Missing required attribute: who',
      code: 'MISSING_ATTRIBUTE',
      suggestedAction: {
        type: 'add-attribute',
        label: 'Add who attribute',
        attributes: { who: 'speaker-1' },
      },
    };

    const onActionClick = jest.fn();

    render(
      <HintTooltip hint={hint} position={mockPosition} visible onActionClick={onActionClick} />
    );

    const actionButton = screen.getByText('Add who attribute');
    expect(actionButton).toBeInTheDocument();
  });

  it('should call onActionClick when action button is clicked', () => {
    const hint: Hint = {
      severity: 'invalid',
      message: 'Missing required attribute: who',
      code: 'MISSING_ATTRIBUTE',
      suggestedAction: {
        type: 'add-attribute',
        label: 'Add who attribute',
        attributes: { who: 'speaker-1' },
      },
    };

    const onActionClick = jest.fn();

    render(
      <HintTooltip hint={hint} position={mockPosition} visible onActionClick={onActionClick} />
    );

    const actionButton = screen.getByText('Add who attribute');
    fireEvent.click(actionButton);

    expect(onActionClick).toHaveBeenCalledWith(hint.suggestedAction);
  });

  it('should not render action button when no suggested action', () => {
    const hint: Hint = {
      severity: 'valid',
      message: 'Ready to apply tag',
      code: 'VALID',
    };

    render(<HintTooltip hint={hint} position={mockPosition} visible />);

    // Should not have any button
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  it('should position tooltip at specified coordinates', () => {
    const hint: Hint = {
      severity: 'valid',
      message: 'Ready to apply tag',
      code: 'VALID',
    };

    const { container } = render(
      <HintTooltip hint={hint} position={{ x: 200, y: 300 }} visible />
    );

    const tooltip = container.querySelector('.hint-tooltip');
    expect(tooltip).toHaveStyle({ left: '200px', top: '300px' });
  });

  it('should not render when visible is false', () => {
    const hint: Hint = {
      severity: 'valid',
      message: 'Ready to apply tag',
      code: 'VALID',
    };

    render(<HintTooltip hint={hint} position={mockPosition} visible={false} />);

    expect(screen.queryByText('Ready to apply tag')).not.toBeInTheDocument();
  });

  it('should render with accessible attributes', () => {
    const hint: Hint = {
      severity: 'valid',
      message: 'Ready to apply tag',
      code: 'VALID',
    };

    render(<HintTooltip hint={hint} position={mockPosition} visible />);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('aria-label', 'Validation hint: Ready to apply tag');
  });

  it('should render with severity-specific aria-live', () => {
    const hint: Hint = {
      severity: 'invalid',
      message: 'Missing required attribute: who',
      code: 'MISSING_ATTRIBUTE',
    };

    render(<HintTooltip hint={hint} position={mockPosition} visible />);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('aria-live', 'assertive');
  });
});
