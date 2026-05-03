import { useCallback, useRef, useState } from 'react';
import { createIdempotencyKey } from '../utils/idempotency';

export function useIdempotencyKey() {
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const resetIdempotencyKey = useCallback(() => {
    idempotencyKeyRef.current = createIdempotencyKey();
    return idempotencyKeyRef.current;
  }, []);

  return { idempotencyKeyRef, resetIdempotencyKey };
}

export function useIdempotentSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const { idempotencyKeyRef, resetIdempotencyKey } = useIdempotencyKey();

  const beginSubmit = useCallback(() => {
    if (submitLockRef.current) {
      return false;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    return true;
  }, []);

  const endSubmit = useCallback(() => {
    submitLockRef.current = false;
    setIsSubmitting(false);
  }, []);

  const resetSubmit = useCallback(() => {
    submitLockRef.current = false;
    setIsSubmitting(false);
    resetIdempotencyKey();
  }, [resetIdempotencyKey]);

  return {
    beginSubmit,
    endSubmit,
    idempotencyKeyRef,
    isSubmitting,
    resetIdempotencyKey,
    resetSubmit
  };
}
