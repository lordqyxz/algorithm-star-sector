import { useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import { gameLevels } from '@/game/levels'
import { loadSave } from '@/game/save'
import { t, zh, medalName, type LevelId } from '@/game/locale'

type Line = { x1: number; y1: number; x2: number; y2: number }
type StarNode = { id: string; label: string; meta: string; x: number; y: number; kind: 'hub' | 'leg'; tone: 'none' | 'gold' | 'silver' | 'bronze' }

const W = 1000
const H = 580
const CX = W / 2
const CY = H / 2

/**
 * 关卡星图：枢纽星（太阳邻域）居中，六大航段按真实距离（光年对数半径）环绕，
 * 奖章状态决定星色。连线为航行通路，鼠标移动带来视差（3D 倾斜）。
 */
export function StarMapNav({ onClose, onOpenGame }: { onClose: () => void; onOpenGame: () => void }) {
  const planeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { nodes, lines } = useMemo<{ nodes: StarNode[]; lines: Line[] }>(() => {
    const nodes: StarNode[] = [{ id: 'hub', label: t('hud.hubLabel'), meta: '', x: CX, y: CY, kind: 'hub', tone: 'none' }]
    const lines: Line[] = []
    const save = loadSave()
    const logMin = Math.log10(Math.min(...gameLevels.map(level => level.ly)))
    const logMax = Math.log10(Math.max(...gameLevels.map(level => level.ly)))
    gameLevels.forEach((level, index) => {
      const angle = -Math.PI / 2 + (index / gameLevels.length) * Math.PI * 2
      const ratio = logMax === logMin ? 0.5 : (Math.log10(level.ly) - logMin) / (logMax - logMin)
      const x = CX + Math.cos(angle) * (120 + ratio * 130)
      const y = CY + Math.sin(angle) * (84 + ratio * 96)
      lines.push({ x1: CX, y1: CY, x2: x, y2: y })
      const record = save[level.variants[0]?.id ?? '']
      nodes.push({
        id: level.id,
        label: zh.level[level.id as LevelId].title,
        meta: record ? medalName(record.medal) : t('hud.legLocked'),
        x, y, kind: 'leg',
        tone: record ? record.medal : 'none',
      })
    })
    return { nodes, lines }
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
        <svg className="star-lines" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {lines.map((line, index) => <line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className="star-line gold" />)}
        </svg>
        {nodes.map(node => <button type="button" key={node.id} className={`star ${node.kind} ${node.tone}`} style={{ left: `${(node.x / W) * 100}%`, top: `${(node.y / H) * 100}%` }} onClick={() => { onClose(); onOpenGame() }}>
          <span className="star-glow" aria-hidden="true" />
          <span className="star-label">{node.label}{node.meta ? <small>{node.meta}</small> : null}</span>
        </button>)}
      </div>
    </div>
    <p className="star-map-foot">{t('hud.starMapFoot')}</p>
  </div>
}
