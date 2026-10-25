import type { SaveData } from '@/game/types'
import type { LabAction, LabKind } from './simulation/interactive'

const storageKey = 'algorithmia-save-v1'

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as SaveData) : {}
  } catch {
    return {}
  }
}

export function saveRecord(save: SaveData): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(save))
  } catch {
    /* 隐私模式等场景下静默失败，进度只留在内存 */
  }
}

export type CourseRecord = {
  step: number
  checked: boolean
  transferred?: boolean
  completedAt?: string
}
export type CourseSave = Record<
  string,
  { variant: 0 | 1; attempts: Partial<Record<0 | 1, CourseRecord>> }
>
const courseStorageKey = 'algorithmia-course-v1'

export function loadCourseSave(): CourseSave {
  try {
    const data: unknown = JSON.parse(
      window.localStorage.getItem(courseStorageKey) ?? '{}',
    )
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    const valid: CourseSave = {}
    for (const [id, entry] of Object.entries(data)) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        (entry.variant !== 0 && entry.variant !== 1)
      )
        continue
      const attempts: Partial<Record<0 | 1, CourseRecord>> = {}
      for (const variant of [0, 1] as const) {
        const record = entry.attempts?.[variant]
        if (
          record &&
          Number.isSafeInteger(record.step) &&
          record.step >= 0 &&
          typeof record.checked === 'boolean'
        ) {
          attempts[variant] = {
            step: record.step,
            checked: record.checked,
            transferred: record.transferred === true,
            ...(typeof record.completedAt === 'string'
              ? { completedAt: record.completedAt }
              : {}),
          }
        }
      }
      valid[id] = { variant: entry.variant, attempts }
    }
    return valid
  } catch {
    return {}
  }
}

export function saveCourseRecord(
  id: string,
  variant: 0 | 1,
  record: CourseRecord,
) {
  const save = loadCourseSave()
  const previous = save[id]?.attempts[variant]
  save[id] = {
    variant,
    attempts: {
      ...save[id]?.attempts,
      [variant]: {
        ...record,
        ...(previous?.completedAt ? { completedAt: previous.completedAt } : {}),
      },
    },
  }
  try {
    window.localStorage.setItem(courseStorageKey, JSON.stringify(save))
  } catch {
    /* Storage may be unavailable; the live scene still works. */
  }
}

export type LabAttempt = {
  mode: 'practice' | 'challenge'
  variant: 0 | 1
  parameter: number
  actions: LabAction[]
  hints: number
  errors: number
}
export type LabMetrics = {
  steps: number
  hints: number
  errors: number
  variant: 0 | 1
  parameter: number
  judgementVersion?: 2
}
export type LabRecord = {
  assistedMetrics?: LabMetrics
  independentMetrics?: LabMetrics
  independentMetricsV2?: LabMetrics & { judgementVersion: 2 }
  independentV2?: string
  viewed?: boolean
  assisted?: string
  independent?: string
  last?: LabAttempt
  steps?: number
  hints?: number
  errors?: number
}
export type LabSave = Partial<Record<LabKind, LabRecord>>
const labStorageKey = 'algorithmia-labs-v1'

export function loadLabSave(): LabSave {
  try {
    const data = JSON.parse(window.localStorage.getItem(labStorageKey) ?? '{}')
    const save: LabSave = {}
    for (const kind of ['dijkstra', 'knapsack', 'maxflow'] as const) {
      const entry = data?.[kind]
      if (!entry || typeof entry !== 'object') continue
      const last = entry.last
      save[kind] = {
        viewed: entry.viewed === true,
        ...(['assistedMetrics', 'independentMetrics'] as const).reduce(
          (valid, key) => {
            const metrics = entry[key]
            return metrics &&
              [metrics.steps, metrics.hints, metrics.errors].every(
                (n) => Number.isSafeInteger(n) && n >= 0,
              ) &&
              (metrics.variant === 0 || metrics.variant === 1) &&
              Number.isSafeInteger(metrics.parameter)
              ? { ...valid, [key]: metrics }
              : valid
          },
          {} as Partial<
            Record<'assistedMetrics' | 'independentMetrics', LabMetrics>
          >,
        ),
        ...(entry.independentMetricsV2?.judgementVersion === 2 &&
          [entry.independentMetricsV2.steps, entry.independentMetricsV2.hints, entry.independentMetricsV2.errors].every((n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0) &&
          (entry.independentMetricsV2.variant === 0 || entry.independentMetricsV2.variant === 1) &&
          Number.isSafeInteger(entry.independentMetricsV2.parameter)
          ? { independentMetricsV2: entry.independentMetricsV2 as LabMetrics & { judgementVersion: 2 } }
          : {}),
        ...(typeof entry.assisted === 'string'
          ? { assisted: entry.assisted }
          : {}),
        ...(typeof entry.independent === 'string'
          ? { independent: entry.independent }
          : {}),
        ...(typeof entry.independentV2 === 'string' &&
          entry.independentMetricsV2?.judgementVersion === 2 &&
          [entry.independentMetricsV2.steps, entry.independentMetricsV2.hints, entry.independentMetricsV2.errors].every((n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0) &&
          (entry.independentMetricsV2.variant === 0 || entry.independentMetricsV2.variant === 1) &&
          Number.isSafeInteger(entry.independentMetricsV2.parameter)
          ? { independentV2: entry.independentV2 }
          : {}),
        steps:
          Number.isSafeInteger(entry.steps) && entry.steps >= 0
            ? entry.steps
            : 0,
        hints:
          Number.isSafeInteger(entry.hints) && entry.hints >= 0
            ? entry.hints
            : 0,
        errors:
          Number.isSafeInteger(entry.errors) && entry.errors >= 0
            ? entry.errors
            : 0,
        ...(last &&
        ['practice', 'challenge'].includes(last.mode) &&
        (last.variant === 0 || last.variant === 1) &&
        Number.isSafeInteger(last.parameter) &&
        Array.isArray(last.actions) &&
        last.actions.length <= 1000 &&
        Number.isSafeInteger(last.hints) &&
        last.hints >= 0 &&
        Number.isSafeInteger(last.errors) &&
        last.errors >= 0
          ? {
              last: {
                mode: last.mode,
                variant: last.variant,
                parameter: last.parameter,
                actions: last.actions.filter(
                  (action: unknown) =>
                    action &&
                    typeof action === 'object' &&
                    typeof (action as { type?: unknown }).type === 'string',
                ),
                hints: last.hints,
                errors: last.errors,
              } as LabAttempt,
            }
          : {}),
      }
    }
    return save
  } catch {
    return {}
  }
}

/** A challenge instance is a rule-versioned input, independent of command history. */
export type LabChallengeStatus = { exposed: boolean; completed: boolean }
const exposureStorageKey = 'algorithmia-lab-exposure-v2'
const exposureMemory = new Map<string, LabChallengeStatus>()
const labKinds = new Set<LabKind>(['dijkstra', 'knapsack', 'maxflow'])

export function labChallengeKey(kind: LabKind, variant: 0 | 1, parameter: number): string {
  return `v2:${kind}:${variant}:${parameter}`
}

function readExposure(): Record<string, LabChallengeStatus> {
  let data: unknown
  try { data = JSON.parse(window.localStorage.getItem(exposureStorageKey) ?? '{}') }
  catch { data = {} }
  const valid: Record<string, LabChallengeStatus> = {}
  if (data && typeof data === 'object' && !Array.isArray(data))
    for (const [key, value] of Object.entries(data)) {
      const match = /^v2:(dijkstra|knapsack|maxflow):(0|1):(-?\d+)$/.exec(key)
      if (!match || !labKinds.has(match[1] as LabKind) ||
        !Number.isSafeInteger(Number(match[3])) || !value || typeof value !== 'object' || Array.isArray(value)) continue
      const status = value as Record<string, unknown>
      if (typeof status.exposed !== 'boolean' || typeof status.completed !== 'boolean') continue
      valid[key] = { exposed: status.exposed, completed: status.completed }
    }
  return valid
}

export function labChallengeStatus(kind: LabKind, variant: 0 | 1, parameter: number): LabChallengeStatus {
  const key = labChallengeKey(kind, variant, parameter)
  const disk = readExposure()[key]
  const memory = exposureMemory.get(key)
  return { exposed: !!(disk?.exposed || memory?.exposed), completed: !!(disk?.completed || memory?.completed) }
}

export function markLabChallenge(kind: LabKind, variant: 0 | 1, parameter: number, update: Partial<LabChallengeStatus>): LabChallengeStatus {
  const key = labChallengeKey(kind, variant, parameter)
  const previous = labChallengeStatus(kind, variant, parameter)
  const next = { exposed: previous.exposed || update.exposed === true, completed: previous.completed || update.completed === true }
  exposureMemory.set(key, next)
  try { window.localStorage.setItem(exposureStorageKey, JSON.stringify({ ...readExposure(), [key]: next })) }
  catch { /* The live session still retains the monotone ledger. */ }
  return next
}

export function saveLabRecord(kind: LabKind, record: Partial<LabRecord>) {
  const save = loadLabSave()
  save[kind] = { ...save[kind], ...record }
  try {
    window.localStorage.setItem(labStorageKey, JSON.stringify(save))
  } catch {
    /* The active scene still works without storage. */
  }
}
