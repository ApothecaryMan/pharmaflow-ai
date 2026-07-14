import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
  ];

  it('renders all options', () => {
    render(<SegmentedControl options={options} value='opt1' onChange={() => {}} />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('calls onChange when option clicked', () => {
    const handleChange = vi.fn();
    render(<SegmentedControl options={options} value='opt1' onChange={handleChange} />);

    fireEvent.click(screen.getByText('Option 2'));
    expect(handleChange).toHaveBeenCalledWith('opt2');
  });
});
