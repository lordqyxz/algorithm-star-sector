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
  return <section className="placeholder-page"><div className="placeholder-header"><div><p className="eyebrow">{partLabel} · {chapterLabel}</p><h1>{lessonLabel}</h1><p>{detail}</p></div><span className="dev-badge dev-badge-large"><Code2 size={14} />DEV</span></div><Card className="placeholder-card"><CardContent><div className="placeholder-icon"><Construction size={28} /></div><div className="placeholder-copy"><strong>动画页面占位</strong><span>这里预留给“{chapterTitle}”章节的课堂动画。下一步会按照“预测 → 状态变化 → 公式对齐 → 解释”的方法补齐。</span></div></CardContent></Card><div className="placeholder-blank" aria-label={`${lessonLabel}开发中`}><div><span>COMING SOON</span><b>DEV</b></div></div></section>
}
