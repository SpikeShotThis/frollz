type DomainErrorOptions = {
  label: string;
  params?: Record<string, string | number>;
  details?: readonly unknown[];
};

export class DomainError extends Error {
  public readonly code: string;
  public readonly label: string;
  public readonly params: Record<string, string | number> | undefined;
  public readonly details: readonly unknown[];

  constructor(code: string, message: string, opts: DomainErrorOptions) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.label = opts.label;
    this.params = opts.params;
    this.details = opts.details ?? [];
  }
}
