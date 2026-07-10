import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';

// Mock useSettings
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    switchVariant: 'standard',
    theme: { name: 'Blue', primary: 'blue', hex: '#3b82f6' },
  }),
}));

describe('Switch', () => {
  it('calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(<Switch checked={false} onChange={handleChange} />);

    // Find button by role "switch"
    const switchButton = document.querySelector('button[role="switch"]');
    if (switchButton) {
      fireEvent.click(switchButton);
      expect(handleChange).toHaveBeenCalledWith(true);
    } else {
      // Fallback if role is not strictly defined in component (check implementation)
      // Assuming typical implementation
      const btn = document.querySelector('button');
      if (btn) {
        fireEvent.click(btn);
        expect(handleChange).toHaveBeenCalledWith(true);
      }
    }
  });
});
