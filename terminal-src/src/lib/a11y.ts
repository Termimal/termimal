/**
 * Tiny keyboard-activation helper.
 *
 * Used to make non-button elements (divs, spans) keyboard-accessible
 * when they carry an `onClick`. Apply in three steps at the call site:
 *   1. role="button"
 *   2. tabIndex={0}
 *   3. onKeyDown={onActivate(handler)}
 *
 * The handler fires on Enter (any focusable role) and Space (button role
 * convention). preventDefault stops Space from scrolling the page.
 *
 * Long-term these call sites should become real <button>/<a> elements;
 * this helper is a stop-gap for places where the visual layout (table
 * rows, dropdown menu items) makes a swap non-trivial.
 */
import type { KeyboardEvent } from 'react'

export function onActivate(handler: (e: KeyboardEvent) => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      handler(e)
    }
  }
}
