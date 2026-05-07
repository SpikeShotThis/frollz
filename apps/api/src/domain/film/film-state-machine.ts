import { DomainError } from '../errors.js';
import { filmTransitionMap as sharedFilmTransitionMap } from '@frollz2/schema';

export const filmTransitionMap = sharedFilmTransitionMap;

export function applyFilmTransition(currentStateCode: string, incomingStateCode: string): string | DomainError {
  const allowedTransitions = filmTransitionMap.get(currentStateCode);

  if (!allowedTransitions) {
    return new DomainError('DOMAIN_ERROR', `Unknown film state: ${currentStateCode}`, {
      label: 'errors.film.unknownState',
      params: { state: currentStateCode }
    });
  }

  if (allowedTransitions.includes(incomingStateCode)) {
    return incomingStateCode;
  }

  return new DomainError(
    'DOMAIN_ERROR',
    `Invalid film transition from ${currentStateCode} to ${incomingStateCode}`,
    { label: 'errors.film.invalidTransition', params: { from: currentStateCode, to: incomingStateCode } }
  );
}
