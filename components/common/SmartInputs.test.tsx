import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SmartInput } from './SmartInputs';

describe('SmartInput', () => {
  it('renders correctly', () => {
    render(
      <SmartInput
        placeholder='Test Placeholder'
        value=''
        onChange={() => {}}
        data-testid='smart-input'
      />
    );

    expect(screen.getByPlaceholderText('Test Placeholder')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays the correct value', () => {
    render(<SmartInput value='Hello' onChange={() => {}} />);

    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
  });
});
