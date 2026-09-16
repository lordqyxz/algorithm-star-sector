import { useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import { gameLevels } from '@/game/levels'
import { loadSave } from '@/game/save'
import { t, zh, medalName, type LevelId } from '@/game/locale'

type Arc = { d: string }
type StarNode = { id: string; label: string; meta: string; x: number; y: number; kind: 'hub' | 'leg'; tone: 'none' | 'gold' | 'silver' | 'bronze' }
type Dust = { left: string; top: string; size: number; delay: string; duration: string }

const W = 1000
const H = 580
const CX = W / 2
const CY = H / 2

/**
 * 关卡星图：枢纽星（太阳系）居中，星图整体即太阳邻域，六大航段按真实距离（光年对数半径）环绕，
 * 奖章状态决定星色。航路为带能量流脉冲的弧线，星云底 + 轨道环 + 星尘闪烁营造深空质感，
 * 鼠标移动带来视差（3D 倾斜）。
 */
export function StarMapNav({ onClose, onOpenGame }: { onClose: () => void; onOpenGame: () => void }) {
  const planeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { nodes, arcs, dust } = useMemo<{ nodes: StarNode[]; arcs: Arc[]; dust: Dust[] }>(() => {
    const nodes: StarNode[] = [{ id: 'hub', label: t('hud.hubLabel'), meta: '', x: CX, y: CY, kind: 'hub', tone: 'none' }]
    const arcs: Arc[] = []
    const save = loadSave()
    const logMin = Math.log10(Math.min(...gameLevels.map(level => level.ly)))
    const logMax = Math.log10(Math.max(...gameLevels.map(level => level.ly)))
    gameLevels.forEach((level, index) => {
      const angle = -Math.PI / 2 + (index / gameLevels.length) * Math.PI * 2
      const ratio = logMax === logMin ? 0.5 : (Math.log10(level.ly) - logMin) / (logMax - logMin)
      const x = CX + Math.cos(angle) * (120 + ratio * 130)
      const y = CY + Math.sin(angle) * (84 + ratio * 96)
      // 弧线航路：中点沿法线外凸，正负交替，避免六条航路叠成一幅伞骨。
      const mx = (CX + x) / 2
      const my = (CY + y) / 2
      const nx = -(y - CY)
      const ny = x - CX
      const len = Math.hypot(nx, ny) || 1
      const bow = index % 2 === 0 ? 26 : -26
      const qx = mx + (nx / len) * bow
      const qy = my + (ny / len) * bow
      arcs.push({ d: `M ${CX} ${CY} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}` })
      const record = save[level.variants[0]?.id ?? '']
      nodes.push({
        id: level.id,
        label: zh.level[level.id as LevelId].title,
        meta: record ? medalName(record.medal) : t('hud.legLocked'),
        x, y, kind: 'leg',
        tone: record ? (record.medal as StarNode['tone']) : 'none',
      })
    })
    // 星尘：固定一次随机分布，CSS 只负责闪烁。
    const dust: Dust[] = Array.from({ length: 80 }, () => ({
      left: `${(Math.random() * 100).toFixed(2)}%`,
      top: `${(Math.random() * 100).toFixed(2)}%`,
      size: Math.random() < 0.85 ? 1 : 2,
      delay: `${(Math.random() * 6).toFixed(2)}s`,
      duration: `${(2.5 + Math.random() * 4).toFixed(2)}s`,
    }))
    return { nodes, arcs, dust }
  }, [])

  const onParallax = (event: React.PointerEvent) => {
    const plane = planeRef.current
    if (!plane) return
    const rect = plane.getBoundingClientRect()
    const dx = (event.clientX - rect.left) / rect.width - 0.5
    const dy = (event.clientY - rect.top) / rect.height - 0.5
    plane.style.transform = `perspective(1100px) rotateX(${(14 - dy * 8).toFixed(2)}deg) rotateY(${(dx * 10).toFixed(2)}deg)`
  }

  return <div className="star-map" role="dialog" aria-modal="true" aria-label={t('hud.navMap')} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="star-map-head">
      <div><p className="eyebrow">{t('hud.starMapEyebrow')}</p><h3>{t('hud.starMapHead')}</h3></div>
      <button type="button" className="star-map-close" aria-label={t('hud.navMap')} onClick={onClose}><X size={18} /></button>
    </div>
    <div className="star-map-plane-wrap" onPointerMove={onParallax} onPointerLeave={() => { if (planeRef.current) planeRef.current.style.transform = 'perspective(1100px) rotateX(14deg)' }}>
      <div className="star-map-plane" ref={planeRef}>
        <div className="star-dust" aria-hidden="true">
          {dust.map((d, index) => <i key={index} style={{ left: d.left, top: d.top, width: d.size, height: d.size, animationDelay: d.delay, animationDuration: d.duration }} />)}
        </div>
        <div className="star-orbit spin-slow" aria-hidden="true" />
        <div className="star-orbit spin-fast" aria-hidden="true" />
        <svg className="star-lines" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {arcs.map((arc, index) => <path key={index} d={arc.d} className="star-arc" />)}
          {arcs.map((arc, index) => <path key={`f${index}`} d={arc.d} className="star-flow" />)}
        </svg>
        {nodes.map(node => <button type="button" key={node.id} className={`star ${node.kind} ${node.tone}`} style={{ left: `${(node.x / W) * 100}%`, top: `${(node.y / H) * 100}%` }} onClick={() => { onClose(); onOpenGame() }}>
          <span className="star-reticle" aria-hidden="true" />
          <span className="star-glow" aria-hidden="true" />
          <span className="star-label">{node.label}{node.meta ? <small>{node.meta}</small> : null}</span>
        </button>)}
      </div>
    </div>
    <p className="star-map-foot">{t('hud.starMapFoot')}</p>
  </div>
}
