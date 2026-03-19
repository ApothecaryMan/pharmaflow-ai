export class StockVersionConflictError extends Error {
  constructor(
    public batchId: string,
    public drugId: string,
    message?: string
  ) {
    super(message || `Optimistic locking failure: Batch ${batchId} was modified by another transaction.`);
    this.name = 'StockVersionConflictError';
  }
}
