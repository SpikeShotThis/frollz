import { DomainError } from '../errors.js';
import { filmTransitionMap as sharedFilmTransitionMap } from '@frollz2/schema';

export const filmTransitionMap = sharedFilmTransitionMap;

export function applyFilmTransition(currentStateCode: string, incomingStateCode: string): string | DomainError {
  const allowedTransitions = filmTransitionMap.get(currentStateCode);

  if (!allowedTransitions) {
    return new DomainError('DOMAIN_ERROR', `Unknown film state: ${currentStateCode}`);
  }

  if (allowedTransitions.includes(incomingStateCode)) {
    return incomingStateCode;
  }

  return new DomainError(
    'DOMAIN_ERROR',
    `Invalid film transition from ${currentStateCode} to ${incomingStateCode}`
  );
}
