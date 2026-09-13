import { ArrowRight, GitBranch, Layers3, Network } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { algorithmParts, siteIntro } from '@/content'

type HomePageProps = {
  onOpenLesson: (id: string) => void
}

export function HomePage({ onOpenLesson }: HomePageProps) {
  return <div className="home-page"><section className="intro home-hero"><div><p className="eyebrow">{siteIntro.eyebrow}</p><h1>{siteIntro.title}</h1><p>{siteIntro.description}</p></div><div className="intro-symbols" aria-hidden="true"><GitBranch size={22} /><span>→</span><Network size={22} /></div></section><section className="home-route"><div className="home-section-heading"><div><p className="eyebrow">SANDBOX ROADMAP</p><h2>推演路线：从现象走到公式</h2></div><span>21 个沙盘全部开放</span></div>{algorithmParts.map(part => <section className="home-part" key={part.id}><h3>{part.label}</h3><div className="home-course-grid">{part.chapters.map(chapter => <Card key={chapter.id} className="home-chapter-card"><CardContent><div className="home-chapter-heading"><strong>{chapter.label} · {chapter.title}</strong><span>{chapter.detail}</span></div><div className="home-lesson-list">{chapter.lessons.map(item => <button type="button" key={item.id} className="home-lesson-row" onClick={() => onOpenLesson(item.id)}><span className={`home-course-icon ${item.color}`}><Layers3 size={16} /></span><span className="home-course-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>{item.status === 'dev' ? <span className="lesson-badge">DEV</span> : <ArrowRight className="home-course-action" size={17} />}</button>)}</div></CardContent></Card>)}</div></section>)}</section><Card className="home-method-card"><CardContent><strong>沙盘规则</strong><span>每个沙盘推演都遵循同一套玩法：先预测一步 → 亲手推进每一拍 → 读出公式与复杂度 → 解锁设计思路；王国关卡练手感，学院沙盘看原理。</span></CardContent></Card></div>
}
