import { useCallback, useEffect, useState } from 'react'

const speedCycle = [1, 2, 0.5] as const

/**
 * Shared teaching-playback state machine for every lesson: segmented steps,
 * optional autoplay with speed cycling (VisuAlgo-style), replay, and dataset
 * reset. Anime.js never owns this state; steps are precomputed and pure.
 */
export function useLessonPlayback(stepCount: number, baseIntervalMs = 1900) {
  const [step, setStepState] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(0)
  const lastIndex = Math.max(0, stepCount - 1)
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setStepState(current => Math.min(current + 1, lastIndex)), baseIntervalMs / speedCycle[speedIndex])
    return () => window.clearInterval(timer)
  }, [playing, lastIndex, baseIntervalMs, speedIndex])
  useEffect(() => { if (playing && step >= lastIndex) setPlaying(false) }, [playing, step, lastIndex])
  const setStep = useCallback((next: number) => { setPlaying(false); setStepState(Math.max(0, Math.min(next, lastIndex))) }, [lastIndex])
  const togglePlaying = useCallback(() => setPlaying(current => !current), [])
  const cycleSpeed = useCallback(() => setSpeedIndex(current => (current + 1) % speedCycle.length), [])
  const reset = useCallback(() => { setPlaying(false); setStepState(0) }, [])
  return { step, setStep, playing, togglePlaying, replay: reset, reset, speed: speedCycle[speedIndex], cycleSpeed }
}
