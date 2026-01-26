import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SampleGallery } from '@/components/samples/SampleGallery';

describe('SampleGallery', () => {
  it('should display welcome message', () => {
    render(<SampleGallery onSelect={() => {}} />);

    expect(screen.getByText('Welcome to TEI Dialogue Editor')).toBeInTheDocument();
    expect(screen.getByText(/Explore dialogue annotation/)).toBeInTheDocument();
  });

  it('should display all sample cards', () => {
    render(<SampleGallery onSelect={() => {}} />);

    // Check that all titles are present
    expect(screen.getByText('The Yellow Wallpaper')).toBeInTheDocument();
    expect(screen.getByText('The Gift of the Magi')).toBeInTheDocument();
    expect(screen.getByText('The Tell-Tale Heart')).toBeInTheDocument();
    expect(screen.getByText('An Occurrence at Owl Creek Bridge')).toBeInTheDocument();
    expect(screen.getByText('Pride and Prejudice - Chapter 1')).toBeInTheDocument();

    // Check that author and year information is present (using getAllByText since it appears multiple times)
    const years = screen.getAllByText(/1892|1890|1905|1843|1813/);
    expect(years.length).toBeGreaterThan(0);
    const authors = screen.getAllByText(/Henry|Austen|Poe|Bierce|Gilman/);
    expect(authors.length).toBeGreaterThan(0);
  });

  it('should display sample metadata', () => {
    render(<SampleGallery onSelect={() => {}} />);

    // Check for dialogue count
    expect(screen.getByText('15')).toBeInTheDocument();
    const dialoguePassages = screen.getAllByText(/dialogue passages/i);
    expect(dialoguePassages.length).toBeGreaterThan(0);

    // Check for character count
    const characterCounts = screen.getAllByText('3');
    expect(characterCounts.length).toBeGreaterThan(0);

    // Check for word count
    expect(screen.getByText('6,000')).toBeInTheDocument();

    // Check for difficulty badges
    const intermediateBadges = screen.getAllByText('intermediate');
    expect(intermediateBadges.length).toBeGreaterThan(0);
    expect(screen.getByText('advanced')).toBeInTheDocument();
  });

  it('should display pattern badges', () => {
    render(<SampleGallery onSelect={() => {}} />);

    const firstPerson = screen.getAllByText('first-person');
    expect(firstPerson.length).toBeGreaterThan(0);
    const dialogueHeavy = screen.getAllByText('dialogue-heavy');
    expect(dialogueHeavy.length).toBeGreaterThan(0);
    const internalMonologue = screen.getAllByText('internal-monologue');
    expect(internalMonologue.length).toBeGreaterThan(0);
  });

  it('should call onSelect when Load Sample is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(<SampleGallery onSelect={onSelect} />);

    const loadButtons = screen.getAllByRole('button', { name: /Load Sample/i });
    await user.click(loadButtons[0]);

    expect(onSelect).toHaveBeenCalledWith('yellow-wallpaper');
  });

  it('should display difficulty legend', () => {
    render(<SampleGallery onSelect={() => {}} />);

    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText(/Simple dialogue patterns/)).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText(/Mixed narrative styles/)).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText(/Complex attribution/)).toBeInTheDocument();
  });

  it('should display help text for custom documents', () => {
    render(<SampleGallery onSelect={() => {}} />);

    expect(screen.getByText(/Want to use your own documents?/i)).toBeInTheDocument();
    expect(screen.getByText(/You can upload your own TEI XML files/i)).toBeInTheDocument();
  });

  it('should show error message when sample load fails', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockLoadSample = jest.fn().mockRejectedValue(new Error('Network error'));

    const { getAllByText, queryByText } = render(
      <SampleGallery
        onSelect={jest.fn()}
        onLoadSample={mockLoadSample}
      />
    );

    const buttons = getAllByText('Load Sample');
    await user.click(buttons[0]);

    // Check if error appears
    await waitFor(() => {
      expect(queryByText(/Failed to load sample/i)).toBeInTheDocument();
      expect(queryByText(/Network error/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
