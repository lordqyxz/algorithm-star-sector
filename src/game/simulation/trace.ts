import type { TraceFrame, TraceItem } from '../types'

export function items(
  values: readonly (number | string)[],
  active: readonly number[] = [],
  settled: readonly number[] = [],
): TraceItem[] {
  return values.map((value, index) => ({
    id: `${value}:${values.slice(0, index).filter((v) => v === value).length}`,
    value,
    label: String(index),
    tone: active.includes(index)
      ? 'active'
      : settled.includes(index)
        ? 'settled'
        : undefined,
  }))
}

/** Copy at the simulation boundary so later mutations cannot rewrite the past. */
export function record(frames: TraceFrame[], frame: TraceFrame): void {
  frames.push(structuredClone(frame))
}
