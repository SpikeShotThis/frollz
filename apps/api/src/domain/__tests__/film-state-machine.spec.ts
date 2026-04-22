import { describe, expect, it } from 'vitest';
import { applyFilmTransition, filmTransitionMap } from '../film/film-state-machine.js';
import { DomainError } from '../errors.js';

describe('applyFilmTransition', () => {
  it('accepts every declared valid transition', () => {
    for (const [fromState, toStates] of filmTransitionMap.entries()) {
      for (const toState of toStates) {
        const result = applyFilmTransition(fromState, toState);
        expect(result).toBe(toState);
      }
    }
  });

  it('rejects invalid self transitions except stored', () => {
    for (const state of filmTransitionMap.keys()) {
      const result = applyFilmTransition(state, state);
      if (state === 'stored') {
        expect(result).toBe('stored');
      } else {
        expect(result).toBeInstanceOf(DomainError);
      }
    }
  });

  it('rejects skip-forward and backwards transitions', () => {
    expect(applyFilmTransition('purchased', 'developed')).toBeInstanceOf(DomainError);
    expect(applyFilmTransition('developed', 'purchased')).toBeInstanceOf(DomainError);
  });
});