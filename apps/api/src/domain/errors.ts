export class DomainError extends Error {
  public readonly code: string;
  public readonly details: readonly unknown[];

  constructor(code: string, message: string, details: readonly unknown[] = []) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}
