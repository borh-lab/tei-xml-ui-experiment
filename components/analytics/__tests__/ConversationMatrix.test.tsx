// @ts-nocheck
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationMatrix } from '@/components/analytics/ConversationMatrix';

describe('ConversationMatrix', () => {
  it('should display conversation heatmap', () => {
    const matrix = {
      matrix: new Map([
        ['alice', new Map([['bob', 5], ['charlie', 3]])],
        ['bob', new Map([['alice', 4], ['charlie', 2]])],
        ['charlie', new Map([['alice', 1]])]
      ]),
      totalInteractions: 15
    };

    render(<ConversationMatrix matrix={matrix} />);
    expect(screen.getByText('Conversation Matrix')).toBeInTheDocument();
  });

  it('should display empty state when no interactions', () => {
    const matrix = {
      matrix: new Map(),
      totalInteractions: 0
    };
    render(<ConversationMatrix matrix={matrix} />);
    expect(screen.getByText('No conversations found')).toBeInTheDocument();
  });
});
