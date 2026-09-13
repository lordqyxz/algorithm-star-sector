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
