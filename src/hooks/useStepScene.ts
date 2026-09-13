import { useEffect, type RefObject } from 'react'
import { createScope } from 'animejs'

/**
 * Runs one scoped Anime.js transition per teaching step and cleans it up.
 * Pass `[step]` (plus anything the setup closure reads) as `deps`; the closure
 * itself changes every render and must not retrigger the effect.
 * Under `prefers-reduced-motion` the scene stays static; every step must still
 * be understandable from the final state alone.
 */
export function useStepScene(rootRef: RefObject<HTMLElement | null>, setup: () => void, deps: readonly unknown[]) {
  useEffect(() => {
    if (!rootRef.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const scope = createScope({ root: rootRef }).add(setup)
    return () => scope.revert()
  }, deps)
}
