import type { SaveData } from '@/game/types'

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

export type CourseRecord = { step: number; checked: boolean; transferred?: boolean; completedAt?: string }
export type CourseSave = Record<string, { variant: 0 | 1; attempts: Partial<Record<0 | 1, CourseRecord>> }>
const courseStorageKey = 'algorithmia-course-v1'

export function loadCourseSave(): CourseSave {
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(courseStorageKey) ?? '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    const valid: CourseSave = {}
    for (const [id, entry] of Object.entries(data)) {
      if (!entry || typeof entry !== 'object' || (entry.variant !== 0 && entry.variant !== 1)) continue
      const attempts: Partial<Record<0 | 1, CourseRecord>> = {}
      for (const variant of [0, 1] as const) {
        const record = entry.attempts?.[variant]
        if (record && Number.isSafeInteger(record.step) && record.step >= 0 && typeof record.checked === 'boolean') {
          attempts[variant] = { step: record.step, checked: record.checked, transferred: record.transferred === true, ...(typeof record.completedAt === 'string' ? { completedAt: record.completedAt } : {}) }
        }
      }
      valid[id] = { variant: entry.variant, attempts }
    }
    return valid
  } catch { return {} }
}

export function saveCourseRecord(id: string, variant: 0 | 1, record: CourseRecord) {
  const save = loadCourseSave()
  const previous = save[id]?.attempts[variant]
  save[id] = { variant, attempts: { ...save[id]?.attempts, [variant]: { ...record, ...(previous?.completedAt ? { completedAt: previous.completedAt } : {}) } } }
  try { window.localStorage.setItem(courseStorageKey, JSON.stringify(save)) } catch { /* Storage may be unavailable; the live scene still works. */ }
}
