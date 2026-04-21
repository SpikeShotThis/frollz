export type FormState = {
  loading: boolean;
  fieldErrors: Record<string, string>;
  formError: string | null;
};

export type TableState = {
  loading: boolean;
  empty: boolean;
  error: string | null;
  retry: () => Promise<void>;
};
