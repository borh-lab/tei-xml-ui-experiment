// @ts-nocheck
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { TagBreadcrumb } from '@/components/editor/TagBreadcrumb';

// Mock the Effect-based useDocumentService hook
jest.mock('@/lib/effect/react/hooks', () => ({
  useDocumentService: () => ({
    document: null,
    loadDocument: jest.fn(),
    updateTag: jest.fn(),
  }),
}));

describe('TagBreadcrumb (Effect-based)', () => {
  it('should render nothing when no tag is selected', () => {
    const { container } = render(<TagBreadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  it('should render without props', () => {
    const { container } = render(<TagBreadcrumb />);
    // No tag selected, should render nothing
    expect(container.firstChild).toBeNull();
  });

  // Note: The new Effect-based implementation doesn't use DOM event listeners
  // It gets state from useDocumentService hook. Tests for full functionality
  // would require mocking the Effect service layer, which is tested separately
  // in lib/effect/__tests__/ directory.
});
