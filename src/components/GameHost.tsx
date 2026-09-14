import { useEffect, useRef } from 'react'

/**
 * React 与游戏边界的唯一接触面：一个挂载点。
 * 游戏内部（场景/状态/输入）不使用 React；本组件只负责生命周期。
 */
export function GameHost() {
  const hostRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let game: { destroy(): void } | null = null
    void import('../game/bootstrap').then(async module => {
      if (cancelled) return
      game = await module.startAlgorithmia(host)
    })
    return () => { cancelled = true; game?.destroy() }
  }, [])
  return <div ref={hostRef} className="game-host" aria-label="算法星域游戏画面" />
}
