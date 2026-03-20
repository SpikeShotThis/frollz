import { expect } from 'vitest'
import * as vitestAxeMatchers from 'vitest-axe/matchers'
import 'vitest-canvas-mock';

expect.extend(vitestAxeMatchers)

// jsdom doesn't implement getComputedStyle with pseudo-elements; axe-core calls it,
// so we stub out the pseudo-element path to avoid noisy "Not implemented" errors.
const _getComputedStyle = window.getComputedStyle.bind(window)
window.getComputedStyle = (element: Element, pseudoElt?: string | null): CSSStyleDeclaration => {
  if (pseudoElt) {
    // Ignore the pseudo-element argument and fall back to the real computed style
    // so callers (e.g. axe-core) still receive a proper CSSStyleDeclaration.
    return _getComputedStyle(element)
  }
  return _getComputedStyle(element)
}
