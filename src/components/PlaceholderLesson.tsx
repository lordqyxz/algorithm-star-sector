import { Code2, Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type PlaceholderLessonProps = {
  partLabel: string
  chapterLabel: string
  chapterTitle: string
  lessonLabel: string
  detail: string
}

export function PlaceholderLesson({ partLabel, chapterLabel, chapterTitle, lessonLabel, detail }: PlaceholderLessonProps) {
  return <section className="placeholder-page"><div className="placeholder-header"><div><p className="eyebrow">{partLabel} · {chapterLabel}</p><h1>{lessonLabel}</h1><p>{detail}</p></div><span className="dev-badge dev-badge-large"><Code2 size={14} />DEV</span></div><Card className="placeholder-card"><CardContent><div className="placeholder-icon"><Construction size={28} /></div><div className="placeholder-copy"><strong>沙盘建造中</strong><span>「{chapterTitle}」的沙盘推演正在施工。建成后可直接游玩，并按"预测 → 逐拍推演 → 设计思路"的玩法展开。</span></div></CardContent></Card><div className="placeholder-blank" aria-label={`${lessonLabel}建造中`}><div><span>UNDER CONSTRUCTION</span><b>建造中</b></div></div></section>
}
