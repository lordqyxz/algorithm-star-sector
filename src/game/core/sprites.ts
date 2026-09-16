import { Assets, Sprite, Texture } from 'pixi.js'
import fuelRodDefault from '@/assets/sprites/fuel-rod-default.png'
import fuelRodSorted from '@/assets/sprites/fuel-rod-sorted.png'
import fuelRodFocus from '@/assets/sprites/fuel-rod-focus.png'
import fuelRodKey from '@/assets/sprites/fuel-rod-key.png'
import fuelRodPivot from '@/assets/sprites/fuel-rod-pivot.png'
import fuelRodTarget from '@/assets/sprites/fuel-rod-target.png'
import fuelRodMuted from '@/assets/sprites/fuel-rod-muted.png'
import socketUrl from '@/assets/sprites/socket.png'
import armColumn from '@/assets/sprites/arm-column.png'
import armClawOpen from '@/assets/sprites/arm-claw-open.png'
import armClawClosed from '@/assets/sprites/arm-claw-closed.png'
import railMount from '@/assets/sprites/rail-mount.png'

/**
 * 程序化生成的矢量贴图资产（SVG → PNG，3 倍分辨率，透明底）。
 * 资产缺失时所有取用方必须回退到 Graphics 矢量路径，游戏不因资产缺失而不可玩。
 */
export const spriteUrls = {
  rodDefault: fuelRodDefault,
  rodSorted: fuelRodSorted,
  rodFocus: fuelRodFocus,
  rodKey: fuelRodKey,
  rodPivot: fuelRodPivot,
  rodTarget: fuelRodTarget,
  rodMuted: fuelRodMuted,
  socket: socketUrl,
  armColumn,
  clawOpen: armClawOpen,
  clawClosed: armClawClosed,
  railMount,
} as const

export type SpriteKey = keyof typeof spriteUrls

let available: boolean | null = null

/** 预加载全部贴图；任一失败即整体标记不可用（走矢量回退）。 */
export async function loadSprites(): Promise<boolean> {
  if (available !== null) return available
  try {
    await Assets.load<Record<string, never>>({ src: { ...spriteUrls } as never })
    available = true
  } catch {
    available = false
  }
  return available
}

export function spritesReady(): boolean {
  return available === true
}

/** 取贴图；未加载成功返回 null（调用方走矢量回退）。 */
export function spriteTexture(key: SpriteKey): Texture | null {
  if (!spritesReady()) return null
  try {
    return Texture.from(spriteUrls[key]) ?? null
  } catch {
    return null
  }
}

/** 按 CSS 尺寸创建贴图精灵（3 倍图缩到目标尺寸，autoDensity 下清晰）。 */
export function makeSprite(key: SpriteKey, cssWidth: number, cssHeight: number): Sprite | null {
  const texture = spriteTexture(key)
  if (!texture) return null
  const sprite = new Sprite(texture)
  sprite.width = cssWidth
  sprite.height = cssHeight
  return sprite
}
