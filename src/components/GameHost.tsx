import { useEffect, useRef, useState } from 'react'
import { t } from '@/game/locale'

/**
 * React 与游戏边界的唯一接触面：一个挂载点。
 * 游戏内部（场景/状态/输入）不使用 React；本组件只负责生命周期。
 */
export function GameHost({ mode }: { mode: 'overview' | 'course' }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let game: { destroy(): void } | null = null
    setStatus('loading')
    void import('../game/bootstrap').then(async module => {
      if (cancelled) return
      const instance = await module.startAlgorithmia(host, mode)
      if (cancelled) { instance.destroy(); return }
      game = instance
      setStatus('ready')
    }).catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true; game?.destroy() }
  }, [mode, attempt])
  return <div className="game-viewport">
    <div ref={hostRef} className="game-host" role="region" aria-label={t('hud.gameHostAria')} aria-busy={status === 'loading'} />
    {status !== 'ready' ? <div className="game-status" role="status"><span className="loading-orbit" aria-hidden="true" /><p>{t(status === 'error' ? 'course.loadError' : 'course.loading')}</p>{status === 'error' ? <button onClick={() => setAttempt(n => n + 1)}>{t('course.retryLoad')}</button> : null}</div> : null}
    <p className="narrow-game-hint">{t('course.narrowHint')}</p>
  </div>
}
