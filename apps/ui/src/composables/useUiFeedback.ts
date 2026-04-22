import { useMessage } from 'naive-ui';

export function useUiFeedback() {
  const message = useMessage();

  function success(content: string): void {
    message.success(content);
  }

  function info(content: string): void {
    message.info(content);
  }

  function error(content: string): void {
    message.error(content);
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
