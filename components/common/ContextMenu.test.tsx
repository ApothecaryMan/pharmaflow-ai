import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useRef } from 'react';
import { ContextMenuProvider, useContextMenu, ContextMenuTrigger } from './ContextMenu';

// Helper component to test hook
const TestComponent = () => {
  const { showMenu } = useContextMenu();
  return (
    <div 
      data-testid="trigger-area" 
      onContextMenu={(e) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY, [
            { label: 'Action 1', action: vi.fn() },
            { label: 'Dangerous', danger: true, action: vi.fn() }
        ]);
      }}
    >
      Right Click Me
    </div>
  );
};

// Helper using ContextMenuTrigger
const TriggerComponent = () => {
    return (
        <ContextMenuTrigger 
            actions={[{ label: 'Trigger Action', action: vi.fn() }]}
            data-testid="cm-trigger"
        >
            Trigger Item
        </ContextMenuTrigger>
    );
};

describe('ContextMenu', () => {
  it('renders without crashing', () => {
    render(
      <ContextMenuProvider>
        <div>Content</div>
      </ContextMenuProvider>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows menu on right click via hook', async () => {
    render(
      <ContextMenuProvider>
        <TestComponent />
      </ContextMenuProvider>
    );

    const trigger = screen.getByTestId('trigger-area');
    fireEvent.contextMenu(trigger, { clientX: 100, clientY: 100 });

    expect(await screen.findByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Dangerous')).toBeInTheDocument();
    const dangerItem = screen.getByText('Dangerous').closest('button');
    expect(dangerItem).toHaveClass('text-red-500');
  });

  it('hides menu on outside click', async () => {
    render(
      <ContextMenuProvider>
        <TestComponent />
        <div data-testid="outside">Outside</div>
      </ContextMenuProvider>
    );

    // Open
    fireEvent.contextMenu(screen.getByTestId('trigger-area'), { clientX: 100, clientY: 100 });
    expect(await screen.findByText('Action 1')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    
    await waitFor(() => {
        expect(screen.queryByText('Action 1')).not.toBeInTheDocument();
    });
  });

  it('ContextMenuTrigger works', async () => {
      render(
          <ContextMenuProvider>
              <TriggerComponent />
          </ContextMenuProvider>
      );

      fireEvent.contextMenu(screen.getByTestId('cm-trigger'), { clientX: 50, clientY: 50 });
      expect(await screen.findByText('Trigger Action')).toBeInTheDocument();
  });
});
