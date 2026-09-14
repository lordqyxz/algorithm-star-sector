import { useEffect, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import { algorithmParts } from '@/content'
import { LessonIcon } from '@/components/LessonIcon'

type StarNode = { id: string; label: string; x: number; y: number; kind: 'hub' | 'chapter' | 'lesson'; partId?: string }
type Line = { x1: number; y1: number; x2: number; y2: number; tone: 'gold' | 'blue' }

const W = 1000
const H = 580
const CX = W / 2
const CY = H / 2

/**
 * 星图导航：真实的星座式布局——枢纽星居中，章节为星座簇环绕，
 * 沙盘是可点击的星。连线表示航行通路，鼠标移动带来视差（3D 倾斜）。
 */
export function StarMapNav({ active, onClose, onOpenLesson, onOpenGame }: { active: string; onClose: () => void; onOpenLesson: (id: string) => void; onOpenGame: () => void }) {
  const planeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { nodes, lines } = useMemo(() => {
    const nodes: StarNode[] = [{ id: 'kingdom', label: '算法星域 · 太阳邻域', x: CX, y: CY, kind: 'hub' }]
    const lines: Line[] = []
    const chapters = algorithmParts.flatMap(part => part.chapters)
    chapters.forEach((chapter, ci) => {
      const angle = -Math.PI / 2 + (ci / chapters.length) * Math.PI * 2
      const ccx = CX + Math.cos(angle) * 208
      const ccy = CY + Math.sin(angle) * 158
      lines.push({ x1: CX, y1: CY, x2: ccx, y2: ccy, tone: 'gold' })
      chapter.lessons.forEach((lesson, li) => {
        const n = chapter.lessons.length
        const lAngle = angle + ((li - (n - 1) / 2) / Math.max(1, n)) * 1.1
        const lx = ccx + Math.cos(lAngle) * 66
        const ly = ccy + Math.sin(lAngle) * 46
        nodes.push({ id: lesson.id, label: lesson.label, x: lx, y: ly, kind: 'lesson', partId: chapter.id })
        lines.push({ x1: ccx, y1: ccy, x2: lx, y2: ly, tone: 'blue' })
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

  return <div className="star-map" role="dialog" aria-modal="true" aria-label="星图导航" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="star-map-head">
      <div><p className="eyebrow">STAR MAP</p><h3>星图导航 · 点击星辰前往</h3></div>
      <button type="button" className="star-map-close" aria-label="关闭星图" onClick={onClose}><X size={18} /></button>
    </div>
    <div className="star-map-plane-wrap" onPointerMove={onParallax} onPointerLeave={() => { if (planeRef.current) planeRef.current.style.transform = 'perspective(1100px) rotateX(14deg)' }}>
      <div className="star-map-plane" ref={planeRef}>
        <svg className="star-lines" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {lines.map((line, index) => <line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className={line.tone === 'gold' ? 'star-line gold' : 'star-line'} />)}
        </svg>
        {nodes.map(node => <button type="button" key={node.id} className={`star ${node.kind} ${active === node.id ? 'active' : ''}`} style={{ left: `${(node.x / W) * 100}%`, top: `${(node.y / H) * 100}%` }} onClick={() => { if (node.kind === 'hub') { onClose(); onOpenGame() } else { onClose(); onOpenLesson(node.id) } }}>
          <span className="star-glow" aria-hidden="true" />
          <span className="star-label">{node.kind === 'lesson' ? <LessonIcon id={node.id} size={12} /> : null}{node.label}</span>
        </button>)}
      </div>
    </div>
    <p className="star-map-foot">ESC 关闭 · 鼠标移动改变视角 · 金色航路连接星域与星座</p>
  </div>
}
