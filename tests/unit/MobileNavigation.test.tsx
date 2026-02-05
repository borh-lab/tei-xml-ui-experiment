// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileNavigation } from '@/components/navigation/MobileNavigation';

describe('MobileNavigation', () => {
  it('should render the menu trigger button', () => {
    render(<MobileNavigation />);
    const trigger = screen.getByRole('button', { name: /open navigation menu/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveClass('md:hidden');
  });

  it('should open the sheet when trigger is clicked', async () => {
    render(<MobileNavigation />);
    const trigger = screen.getByRole('button', { name: /open navigation menu/i });

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Quick access to main features')).toBeInTheDocument();
    });
  });

  it('should display navigation items when sheet is open', async () => {
    render(<MobileNavigation />);
    const trigger = screen.getByRole('button', { name: /open navigation menu/i });

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /samples/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument();
    });
  });

  it('should close the sheet when navigation item is clicked', async () => {
    render(<MobileNavigation />);
    const trigger = screen.getByRole('button', { name: /open navigation menu/i });

    fireEvent.click(trigger);

    await waitFor(() => {
      const homeButton = screen.getByRole('button', { name: /home/i });
      expect(homeButton).toBeInTheDocument();
    });

    const homeButton = screen.getByRole('button', { name: /home/i });
    fireEvent.click(homeButton);

    await waitFor(() => {
      expect(screen.queryByText('Navigation')).not.toBeInTheDocument();
    });
  });

  it('should have correct icons for navigation items', async () => {
    render(<MobileNavigation />);
    const trigger = screen.getByRole('button', { name: /open navigation menu/i });

    fireEvent.click(trigger);

    await waitFor(() => {
      const homeButton = screen.getByRole('button', { name: /home/i });
      const samplesButton = screen.getByRole('button', { name: /samples/i });
      const helpButton = screen.getByRole('button', { name: /help/i });

      expect(homeButton.querySelector('svg')).toBeInTheDocument();
      expect(samplesButton.querySelector('svg')).toBeInTheDocument();
      expect(helpButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('should have md:hidden class on trigger button', () => {
    render(<MobileNavigation />);
    const trigger = screen.getByRole('button', { name: /open navigation menu/i });
    expect(trigger).toHaveClass('md:hidden');
  });
});
