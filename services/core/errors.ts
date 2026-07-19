export class NotFoundError extends Error {
  constructor(message = 'Record not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DuplicateRecordError extends Error {
  constructor(message = 'Duplicate record') {
    super(message);
    this.name = 'DuplicateRecordError';
  }
}

export class TenantScopeError extends Error {
  constructor(message = 'Tenant scope violation') {
    super(message);
    this.name = 'TenantScopeError';
  }
}
