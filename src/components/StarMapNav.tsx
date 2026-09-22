import { useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import { gameLevels } from '@/game/levels'
import { loadSave } from '@/game/save'
import { t, zh, medalName, type LevelId } from '@/game/locale'

type Tone = 'gold' | 'silver' | 'bronze' | 'locked'
type Leg = { id: string; label: string; meta: string; tone: Tone; tier: number; radiusFrac: number; ly: number }
type NodePos = { id: string; x: number; y: number }

/** 星等刻度（光年）：覆盖航段距离对数区间的整数刻度。 */
const LY_TICKS = [5, 25, 100, 400]

/**
 * 关卡星图：参考 stepfun《foundation-model galaxy》封面特效的深空化移植。
 * PixiJS 引擎（src/game/core/galaxy.ts）绘制倾斜尘埃星盘 + 奖章色轨道环 +
 * 差速运行的行星节点（半径 = 航段距离对数、大小 = 奖章等级、彗尾 = 已航行弧段）+
 * 光年刻度轴；React 只保留对话框外壳与无障碍按钮，坐标由引擎逐帧回传后命令式定位。
 * WebGL 不可用时退化为静态椭圆布局（planGalaxyNodes），功能不缺失。
 */
export function StarMapNav({ onClose, onOpenGame }: { onClose: () => void; onOpenGame: () => void }) {
  const planeRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef(new Map<string, HTMLButtonElement>())
  const galaxyRef = useRef<{ setEmphasis: (id: string | null) => void } | null>(null)
  const reducedRef = useRef(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const legs = useMemo<Leg[]>(() => {
    const save = loadSave()
    const logMin = Math.log10(Math.min(...gameLevels.map(level => level.ly)))
    const logMax = Math.log10(Math.max(...gameLevels.map(level => level.ly)))
    return gameLevels.map(level => {
      const record = save[level.variants[0]?.id ?? '']
      const tone: Tone = record ? (record.medal as Tone) : 'locked'
      return {
        id: level.id,
        label: zh.level[level.id as LevelId].title,
        meta: record ? medalName(record.medal) : t('hud.legLocked'),
        tone,
        tier: record ? (record.medal === 'gold' ? 3 : record.medal === 'silver' ? 2 : 1) : 0,
        radiusFrac: logMax === logMin ? 0.5 : (Math.log10(level.ly) - logMin) / (logMax - logMin),
        ly: level.ly,
      }
    })
  }, [])

  const applyPositions = (positions: readonly NodePos[]) => {
    for (const p of positions) {
      const btn = btnRefs.current.get(p.id)
      if (btn) {
        btn.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`
        btn.classList.add('placed')
      }
    }
  }

  useEffect(() => {
    const host = hostRef.current
    const plane = planeRef.current
    if (!host || !plane) return
    let disposed = false
    let cleanup: (() => void) | null = null
    let observer: ResizeObserver | null = null

    const fallbackLayout = () => {
      void import('@/game/core/galaxy').then(({ planGalaxyNodes }) => {
        if (disposed) return
        applyPositions(planGalaxyNodes(plane.clientWidth, plane.clientHeight, legs))
      }).catch(() => {})
    }

    void (async () => {
      let app: import('pixi.js').Application | null = null
      try {
        const [{ Application }, { OrbitGalaxy, planGalaxyNodes }] = await Promise.all([
          import('pixi.js'),
          import('@/game/core/galaxy'),
        ])
        if (disposed) return
        const resolution = Math.min(window.devicePixelRatio || 1, 2)
        app = new Application()
        await app.init({
          resizeTo: plane,
          backgroundAlpha: 0,
          antialias: true,
          preference: 'webgl',
          resolution,
          autoDensity: true,
        })
        if (disposed) {
          app.destroy(true, { children: true })
          return
        }
        app.canvas.className = 'star-map-canvas'
        host.appendChild(app.canvas)
        const logMin = Math.log10(Math.min(...legs.map(l => l.ly)))
        const logMax = Math.log10(Math.max(...legs.map(l => l.ly)))
        const galaxy = new OrbitGalaxy({
          app,
          width: plane.clientWidth,
          height: plane.clientHeight,
          pixelScale: resolution,
          seed: 20260909,
          nodes: legs.map(({ id, radiusFrac, tone, tier }) => ({ id, radiusFrac, tone, tier })),
          ticks: LY_TICKS
            .filter(v => v > Math.pow(10, logMin) * 0.8 && v < Math.pow(10, logMax) * 1.2)
            .map(v => ({ frac: (Math.log10(v) - logMin) / (logMax - logMin || 1), label: `${v} ly` })),
          onNodes: applyPositions,
        })
        galaxyRef.current = galaxy
        reducedRef.current = galaxy.reduced
        app.stage.addChild(galaxy.container)
        if (galaxy.reduced) app.ticker.stop()
        applyPositions(planGalaxyNodes(plane.clientWidth, plane.clientHeight, legs))
        observer = new ResizeObserver(() => {
          galaxy.resize({ width: plane.clientWidth, height: plane.clientHeight, pixelScale: resolution })
          if (galaxy.reduced) galaxy.renderStatic()
        })
        observer.observe(plane)
        cleanup = () => {
          observer?.disconnect()
          observer = null
          galaxyRef.current = null
          galaxy.destroy()
          app?.destroy(true, { children: true })
          app = null
        }
      } catch {
        app?.destroy(true, { children: true })
        app = null
        fallbackLayout()
      }
    })()

    return () => {
      disposed = true
      cleanup?.()
      cleanup = null
    }
    // legs 由 useMemo 固定，一次性挂载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onParallax = (event: React.PointerEvent) => {
    if (reducedRef.current) return
    const plane = planeRef.current
    if (!plane) return
    const rect = plane.getBoundingClientRect()
    const dx = (event.clientX - rect.left) / rect.width - 0.5
    const dy = (event.clientY - rect.top) / rect.height - 0.5
    plane.style.transform = `perspective(1100px) rotateX(${(14 - dy * 8).toFixed(2)}deg) rotateY(${(dx * 10).toFixed(2)}deg)`
  }

  const onParallaxLeave = () => {
    if (reducedRef.current) return
    if (planeRef.current) planeRef.current.style.transform = 'perspective(1100px) rotateX(14deg)'
  }

  return <div className="star-map" role="dialog" aria-modal="true" aria-label={t('hud.navMap')} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="star-map-head">
      <div><p className="eyebrow">{t('hud.starMapEyebrow')}</p><h3>{t('hud.starMapHead')}</h3></div>
      <button type="button" className="star-map-close" aria-label={t('hud.navMap')} onClick={onClose}><X size={18} /></button>
    </div>
    <div className="star-map-plane-wrap" onPointerMove={onParallax} onPointerLeave={onParallaxLeave}>
      <div className="star-map-plane" ref={planeRef}>
        <div className="star-map-galaxy" ref={hostRef} aria-hidden="true" />
        {[{ id: 'hub', label: t('hud.hubLabel'), meta: '', tone: 'locked' as Tone }, ...legs].map(node => (
          <button
            type="button"
            key={node.id}
            ref={el => {
              if (el) btnRefs.current.set(node.id, el)
              else btnRefs.current.delete(node.id)
            }}
            className={`star ${node.id === 'hub' ? 'hub' : `leg ${node.tone}`}`}
            onPointerEnter={() => galaxyRef.current?.setEmphasis(node.id === 'hub' ? null : node.id)}
            onPointerLeave={() => galaxyRef.current?.setEmphasis(null)}
            onFocus={() => galaxyRef.current?.setEmphasis(node.id === 'hub' ? null : node.id)}
            onBlur={() => galaxyRef.current?.setEmphasis(null)}
            onClick={() => { if (node.id !== 'hub') { onClose(); onOpenGame() } }}
          >
            <span className="star-reticle" aria-hidden="true" />
            <span className="star-label">{node.label}{node.meta ? <small>{node.meta}</small> : null}</span>
          </button>
        ))}
      </div>
    </div>
    <p className="star-map-foot">{t('hud.starMapFoot')}</p>
  </div>
}
