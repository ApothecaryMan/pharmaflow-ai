/**
 * UndoManager - Manages a stack of rollback actions for atomic transactions.
 */
export class UndoManager {
  private actions: (() => Promise<void>)[] = [];

  push(action: () => Promise<void>) {
    this.actions.push(action);
  }

  async undoAll() {
    console.warn('[UndoManager] Executing rollbacks...');
    for (let i = this.actions.length - 1; i >= 0; i--) {
      try {
        await this.actions[i]();
      } catch (err) {
        console.error('[UndoManager] Failed to undo action:', err);
      }
    }
    this.actions = [];
  }
}
