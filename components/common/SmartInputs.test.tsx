import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SmartInput } from './SmartInputs';
import React from 'react';

describe('SmartInput', () => {
  it('renders correctly', () => {
    render(
      <SmartInput 
        placeholder="Test Placeholder" 
        value="" 
        onChange={() => {}} 
        data-testid="smart-input"
      />
    );
    
    expect(screen.getByPlaceholderText('Test Placeholder')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays the correct value', () => {
    render(
      <SmartInput 
        value="Hello" 
        onChange={() => {}} 
      />
    );
    
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
  });
});
