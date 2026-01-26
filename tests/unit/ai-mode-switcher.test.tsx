import { render, screen, fireEvent } from '@testing-library/react';
import { AIModeSwitcher } from '@/components/ai/AIModeSwitcher';

describe('AIModeSwitcher', () => {
  test('should render three modes', () => {
    const onModeChange = jest.fn();
    render(<AIModeSwitcher mode="manual" onModeChange={onModeChange} />);

    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('AI Suggest')).toBeInTheDocument();
    expect(screen.getByText('AI Auto')).toBeInTheDocument();
  });

  test('should highlight active mode', () => {
    const onModeChange = jest.fn();
    render(<AIModeSwitcher mode="suggest" onModeChange={onModeChange} />);

    const suggestBtn = screen.getByText('AI Suggest');
    expect(suggestBtn).toHaveClass('bg-primary');
  });

  test('should call onModeChange when button clicked', () => {
    const onModeChange = jest.fn();
    render(<AIModeSwitcher mode="manual" onModeChange={onModeChange} />);

    const autoBtn = screen.getByText('AI Auto');
    fireEvent.click(autoBtn);

    expect(onModeChange).toHaveBeenCalledWith('auto');
  });

  test('should switch to suggest mode', () => {
    const onModeChange = jest.fn();
    render(<AIModeSwitcher mode="manual" onModeChange={onModeChange} />);

    const suggestBtn = screen.getByText('AI Suggest');
    fireEvent.click(suggestBtn);

    expect(onModeChange).toHaveBeenCalledWith('suggest');
  });

  test('should switch to manual mode', () => {
    const onModeChange = jest.fn();
    render(<AIModeSwitcher mode="auto" onModeChange={onModeChange} />);

    const manualBtn = screen.getByText('Manual');
    fireEvent.click(manualBtn);

    expect(onModeChange).toHaveBeenCalledWith('manual');
  });
});
