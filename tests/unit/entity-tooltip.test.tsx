// @ts-nocheck
import { render, screen } from '@testing-library/react';
import { EntityTooltip } from '@/components/editor/EntityTooltip';

describe('EntityTooltip', () => {
  test('shows character info on hover', () => {
    const character = {
      'xml:id': 'darcy',
      persName: 'Mr. Darcy',
      sex: 'M',
      age: 28,
    };

    render(<EntityTooltip entity={character} position={{ x: 100, y: 100 }} visible={true} />);

    expect(screen.getByText('Mr. Darcy')).toBeInTheDocument();
    expect(screen.getByText('Sex:')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('Age:')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
  });
});
