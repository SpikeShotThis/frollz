import { Notify } from 'quasar';

export function useUiFeedback() {
  function success(content: string): void {
    Notify.create({ type: 'positive', message: content });
  }

  function info(content: string): void {
    Notify.create({ type: 'info', message: content });
  }

  function error(content: string): void {
    Notify.create({ type: 'negative', message: content });
  }

  function toErrorMessage(errorValue: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (errorValue instanceof Error && errorValue.message.length > 0) {
      return errorValue.message;
    }

    return fallback;
  }

  return {
    success,
    info,
    error,
    toErrorMessage
  };
}
