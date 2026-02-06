/**
 * Integration Tests for StatusBar
 *
 * Tests the StatusBar component integration with document state,
 * including display of document info, AI mode, selection count,
 * validation status, and save status.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBar } from '@/components/editor/StatusBar';
import type { AIMode } from '@/components/ai/AIModeSwitcher';

describe('StatusBar Integration', () => {
  const defaultProps = {
    documentName: 'test-document.xml',
    hasUnsavedChanges: false,
    aiMode: 'manual' as AIMode,
    selectedPassagesCount: 0,
    totalPassages: 10,
    validationErrors: 0,
    validationWarnings: 0,
    isValidating: false,
    entityCount: 5,
    lastSaved: new Date('2024-01-01T12:00:00Z'),
  };

  describe('Basic Rendering', () => {
    it('should render StatusBar component', () => {
      render(<StatusBar {...defaultProps} />);
      const statusbar = screen.getByTestId('statusbar');
      expect(statusbar).toBeInTheDocument();
      expect(statusbar).toHaveClass('flex', 'items-center', 'justify-between');
    });

    it('should display document name', () => {
      render(<StatusBar {...defaultProps} documentName="test.xml" />);
      const documentInfo = screen.getByTestId('statusbar-document-info');
      expect(documentInfo).toBeInTheDocument();
      expect(documentInfo).toHaveTextContent('test.xml');
    });

    it('should display "Untitled" when no document name provided', () => {
      render(<StatusBar {...defaultProps} documentName={undefined} />);
      const documentInfo = screen.getByTestId('statusbar-document-info');
      expect(documentInfo).toHaveTextContent('Untitled');
    });
  });

  describe('AI Mode Display', () => {
    it('should display Manual mode', () => {
      render(<StatusBar {...defaultProps} aiMode="manual" />);
      const aiMode = screen.getByTestId('statusbar-ai-mode');
      expect(aiMode).toBeInTheDocument();
      expect(aiMode).toHaveTextContent('Manual');
    });

    it('should display AI Suggest mode', () => {
      render(<StatusBar {...defaultProps} aiMode="suggest" />);
      const aiMode = screen.getByTestId('statusbar-ai-mode');
      expect(aiMode).toHaveTextContent('AI Suggest');
    });

    it('should display AI Auto mode', () => {
      render(<StatusBar {...defaultProps} aiMode="auto" />);
      const aiMode = screen.getByTestId('statusbar-ai-mode');
      expect(aiMode).toHaveTextContent('AI Auto');
    });
  });

  describe('Unsaved Changes Indicator', () => {
    it('should show unsaved badge when hasUnsavedChanges is true', () => {
      render(<StatusBar {...defaultProps} hasUnsavedChanges={true} />);
      const unsavedBadge = screen.getByTestId('statusbar-unsaved-badge');
      expect(unsavedBadge).toBeInTheDocument();
      expect(unsavedBadge).toHaveTextContent('Unsaved');
    });

    it('should not show unsaved badge when hasUnsavedChanges is false', () => {
      render(<StatusBar {...defaultProps} hasUnsavedChanges={false} />);
      const unsavedBadge = screen.queryByTestId('statusbar-unsaved-badge');
      expect(unsavedBadge).not.toBeInTheDocument();
    });

    it('should show "Unsaved changes" text in save status when hasUnsavedChanges is true', () => {
      render(<StatusBar {...defaultProps} hasUnsavedChanges={true} />);
      const saveStatus = screen.getByTestId('statusbar-save-status');
      expect(saveStatus).toHaveTextContent('Unsaved changes');
    });
  });

  describe('Selection Count', () => {
    it('should display selection count when passages are selected', () => {
      render(<StatusBar {...defaultProps} selectedPassagesCount={3} totalPassages={10} />);
      const selectionCount = screen.getByTestId('statusbar-selection-count');
      expect(selectionCount).toBeInTheDocument();
      expect(selectionCount).toHaveTextContent('3 of 10 passages selected');
    });

    it('should not display selection count when no passages are selected', () => {
      render(<StatusBar {...defaultProps} selectedPassagesCount={0} totalPassages={10} />);
      const selectionCount = screen.queryByTestId('statusbar-selection-count');
      expect(selectionCount).not.toBeInTheDocument();
    });

    it('should handle single passage selection', () => {
      render(<StatusBar {...defaultProps} selectedPassagesCount={1} totalPassages={10} />);
      const selectionCount = screen.getByTestId('statusbar-selection-count');
      expect(selectionCount).toHaveTextContent('1 of 10 passages selected');
    });
  });

  describe('Entity Count', () => {
    it('should display entity count when entities exist', () => {
      render(<StatusBar {...defaultProps} entityCount={5} />);
      const entityCount = screen.getByTestId('statusbar-entity-count');
      expect(entityCount).toBeInTheDocument();
      expect(entityCount).toHaveTextContent('5 entities');
    });

    it('should not display entity count when entityCount is undefined', () => {
      render(<StatusBar {...defaultProps} entityCount={undefined} />);
      const entityCount = screen.queryByTestId('statusbar-entity-count');
      expect(entityCount).not.toBeInTheDocument();
    });

    it('should not display entity count when entityCount is 0', () => {
      render(<StatusBar {...defaultProps} entityCount={0} />);
      const entityCount = screen.queryByTestId('statusbar-entity-count');
      expect(entityCount).not.toBeInTheDocument();
    });
  });

  describe('Validation Status', () => {
    it('should display "Validating..." when isValidating is true', () => {
      render(<StatusBar {...defaultProps} isValidating={true} />);
      const validation = screen.getByTestId('statusbar-validation');
      expect(validation).toBeInTheDocument();
      expect(validation).toHaveTextContent('Validating...');
    });

    it('should display error count when validationErrors > 0', () => {
      render(<StatusBar {...defaultProps} validationErrors={3} isValidating={false} />);
      const validation = screen.getByTestId('statusbar-validation');
      expect(validation).toBeInTheDocument();
      expect(validation).toHaveTextContent('3 errors');
    });

    it('should display singular "error" when error count is 1', () => {
      render(<StatusBar {...defaultProps} validationErrors={1} isValidating={false} />);
      const validation = screen.getByTestId('statusbar-validation');
      expect(validation).toHaveTextContent('1 error');
    });

    it('should display warning count when validationWarnings > 0', () => {
      render(<StatusBar {...defaultProps} validationWarnings={2} isValidating={false} />);
      const validation = screen.getByTestId('statusbar-validation');
      expect(validation).toBeInTheDocument();
      expect(validation).toHaveTextContent('2 warnings');
    });

    it('should display both errors and warnings when both exist', () => {
      render(
        <StatusBar
          {...defaultProps}
          validationErrors={3}
          validationWarnings={2}
          isValidating={false}
        />
      );
      const validation = screen.getByTestId('statusbar-validation');
      expect(validation).toHaveTextContent('3 errors');
      expect(validation).toHaveTextContent('2 warnings');
    });

    it('should not display validation status when no errors, warnings, or validating', () => {
      render(
        <StatusBar
          {...defaultProps}
          validationErrors={0}
          validationWarnings={0}
          isValidating={false}
        />
      );
      const validation = screen.queryByTestId('statusbar-validation');
      expect(validation).not.toBeInTheDocument();
    });
  });

  describe('Save Status', () => {
    it('should display "Saved just now" for recent saves', () => {
      const recentDate = new Date();
      render(<StatusBar {...defaultProps} hasUnsavedChanges={false} lastSaved={recentDate} />);
      const saveStatus = screen.getByTestId('statusbar-save-status');
      expect(saveStatus).toHaveTextContent('Saved just now');
    });

    it('should display "Not saved" when no lastSaved date', () => {
      render(<StatusBar {...defaultProps} hasUnsavedChanges={false} lastSaved={undefined} />);
      const saveStatus = screen.getByTestId('statusbar-save-status');
      expect(saveStatus).toHaveTextContent('Not saved');
    });

    it('should display formatted date for old saves', () => {
      const oldDate = new Date('2024-01-01T12:00:00Z');
      render(<StatusBar {...defaultProps} hasUnsavedChanges={false} lastSaved={oldDate} />);
      const saveStatus = screen.getByTestId('statusbar-save-status');
      expect(saveStatus).toHaveTextContent('Saved');
    });
  });

  describe('Layout and Structure', () => {
    it('should render left section with document info and AI mode', () => {
      render(<StatusBar {...defaultProps} />);
      const documentInfo = screen.getByTestId('statusbar-document-info');
      const aiMode = screen.getByTestId('statusbar-ai-mode');

      expect(documentInfo).toBeInTheDocument();
      expect(aiMode).toBeInTheDocument();
    });

    it('should render right section with validation, entities, and save status', () => {
      render(<StatusBar {...defaultProps} />);
      const entityCount = screen.getByTestId('statusbar-entity-count');
      const saveStatus = screen.getByTestId('statusbar-save-status');

      expect(entityCount).toBeInTheDocument();
      expect(saveStatus).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all optional props as undefined', () => {
      render(
        <StatusBar
          documentName={undefined}
          hasUnsavedChanges={false}
          aiMode="manual"
          selectedPassagesCount={0}
          totalPassages={0}
          isValidating={false}
        />
      );
      const statusbar = screen.getByTestId('statusbar');
      expect(statusbar).toBeInTheDocument();
    });

    it('should handle zero passages correctly', () => {
      render(
        <StatusBar
          {...defaultProps}
          selectedPassagesCount={0}
          totalPassages={0}
        />
      );
      const statusbar = screen.getByTestId('statusbar');
      expect(statusbar).toBeInTheDocument();
    });

    it('should handle all selected passages', () => {
      render(
        <StatusBar
          {...defaultProps}
          selectedPassagesCount={10}
          totalPassages={10}
        />
      );
      const selectionCount = screen.getByTestId('statusbar-selection-count');
      expect(selectionCount).toHaveTextContent('10 of 10 passages selected');
    });
  });
});
