import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UndoManager } from './undoManager';

describe('UndoManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes pushed actions on undoAll', async () => {
    const manager = new UndoManager();
    const action = vi.fn().mockResolvedValue(undefined);
    manager.push(action);
    await manager.undoAll();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('executes actions in LIFO order', async () => {
    const manager = new UndoManager();
    const order: string[] = [];
    manager.push(vi.fn().mockImplementation(async () => order.push('first')));
    manager.push(vi.fn().mockImplementation(async () => order.push('second')));
    manager.push(vi.fn().mockImplementation(async () => order.push('third')));
    await manager.undoAll();
    expect(order).toEqual(['third', 'second', 'first']);
  });

  it('swallows an error in one action and continues with the rest', async () => {
    const manager = new UndoManager();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const executed: string[] = [];
    manager.push(vi.fn().mockImplementation(async () => executed.push('first')));
    manager.push(vi.fn().mockRejectedValue(new Error('rollback failed')));
    manager.push(vi.fn().mockImplementation(async () => executed.push('third')));

    await expect(manager.undoAll()).resolves.toBeUndefined();
    expect(executed).toEqual(['third', 'first']);
    expect(errorSpy).toHaveBeenCalledWith(
      '[UndoManager] Failed to undo action:',
      expect.any(Error)
    );
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('resets the stack after undoAll', async () => {
    const manager = new UndoManager();
    manager.push(vi.fn().mockResolvedValue(undefined));
    await manager.undoAll();

    const after = vi.fn().mockResolvedValue(undefined);
    manager.push(after);
    await manager.undoAll();
    expect(after).toHaveBeenCalledTimes(1);
  });
});
