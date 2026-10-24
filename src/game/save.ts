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
}
export type LabRecord = {
  assistedMetrics?: LabMetrics
  independentMetrics?: LabMetrics
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
        ...(typeof entry.assisted === 'string'
          ? { assisted: entry.assisted }
          : {}),
        ...(typeof entry.independent === 'string'
          ? { independent: entry.independent }
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

export function saveLabRecord(kind: LabKind, record: Partial<LabRecord>) {
  const save = loadLabSave()
  save[kind] = { ...save[kind], ...record }
  try {
    window.localStorage.setItem(labStorageKey, JSON.stringify(save))
  } catch {
    /* The active scene still works without storage. */
  }
}
