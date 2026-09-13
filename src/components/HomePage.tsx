import { ArrowRight, GitBranch, Layers3, Network } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { algorithmParts, siteIntro } from '@/content'

type HomePageProps = {
  onOpenLesson: (id: string) => void
}

export function HomePage({ onOpenLesson }: HomePageProps) {
  return <div className="home-page"><section className="intro home-hero"><div><p className="eyebrow">{siteIntro.eyebrow}</p><h1>{siteIntro.title}</h1><p>{siteIntro.description}</p></div><div className="intro-symbols" aria-hidden="true"><GitBranch size={22} /><span>→</span><Network size={22} /></div></section><section className="home-route"><div className="home-section-heading"><div><p className="eyebrow">CLRS LEARNING ROUTE</p><h2>按章节从现象走到公式</h2></div><span>DEV 表示待开发占位</span></div>{algorithmParts.map(part => <section className="home-part" key={part.id}><h3>{part.label}</h3><div className="home-course-grid">{part.chapters.map(chapter => <Card key={chapter.id} className="home-chapter-card"><CardContent><div className="home-chapter-heading"><strong>{chapter.label} · {chapter.title}</strong><span>{chapter.detail}</span></div><div className="home-lesson-list">{chapter.lessons.map(item => <button type="button" key={item.id} className="home-lesson-row" onClick={() => onOpenLesson(item.id)}><span className={`home-course-icon ${item.color}`}><Layers3 size={16} /></span><span className="home-course-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>{item.status === 'dev' ? <span className="lesson-badge">DEV</span> : <ArrowRight className="home-course-action" size={17} />}</button>)}</div></CardContent></Card>)}</div></section>)}</section><Card className="home-method-card"><CardContent><strong>绘制方法</strong><span>先让数字、点和递归树发生一次有意义的变化，再把变化压缩成公式；每个已实现课程都包含预测、步骤控制和结论。</span></CardContent></Card></div>
}
