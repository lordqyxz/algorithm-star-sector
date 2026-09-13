import { useState } from 'react'
import { BookOpen, ChevronDown, Home, Layers3, Route, Sparkles } from 'lucide-react'
import { chapterCatalog, algorithmParts } from '@/content'
import { HomePage } from '@/components/HomePage'
import { PlaceholderLesson } from '@/components/PlaceholderLesson'
import { GameApp } from '@/game/GameApp'
import { ClosestPairLesson } from '@/lessons/closest-pair'
import { HeapSortLesson } from '@/lessons/heap-sort'
import { MasterMethodLesson } from '@/lessons/master-method'
import { MergeSortLesson } from '@/lessons/merge-sort'
import { QuickSortLesson } from '@/lessons/quick-sort'

export default function App() {
  const [active, setActive] = useState('home')
  const [topicExpanded, setTopicExpanded] = useState(true)
  const activeLesson = chapterCatalog.flatMap(chapter => chapter.lessons).find(item => item.id === active)
  const activeChapter = chapterCatalog.find(chapter => chapter.lessons.some(item => item.id === active))
  const activePart = algorithmParts.find(part => part.chapters.some(chapter => chapter.id === activeChapter?.id))
  const openLesson = (id: string) => { setActive(id); setTopicExpanded(true) }
  const lessonContent = activeLesson?.status === 'dev'
    ? <PlaceholderLesson partLabel={activePart?.label ?? '算法'} chapterLabel={activeChapter?.label ?? ''} chapterTitle={activeChapter?.title ?? ''} lessonLabel={activeLesson.label} detail={activeLesson.detail} />
    : active === 'merge-sort'
      ? <MergeSortLesson />
      : active === 'divide-conquer'
        ? <ClosestPairLesson />
      : active === 'heap-sort'
        ? <HeapSortLesson />
          : active === 'master-method'
            ? <MasterMethodLesson />
            : <QuickSortLesson />

  return <div className="site-shell"><aside className="site-sidebar"><div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><div><strong>Algorithm</strong><span>Animation Studio</span></div></div><div className="sidebar-label">WORKSPACE</div><nav className="lesson-nav" aria-label="站点主题导航"><button type="button" className={`nav-item nav-home ${active === 'home' ? 'active' : ''}`} aria-current={active === 'home' ? 'page' : undefined} onClick={() => setActive('home')}><span className="nav-icon slate"><Home size={16} /></span><span><b>主页</b><small>学习路线与绘制方法</small></span></button><button type="button" className={`nav-item ${active === 'kingdom' ? 'active' : ''}`} aria-current={active === 'kingdom' ? 'page' : undefined} onClick={() => setActive('kingdom')}><span className="nav-icon green"><Route size={16} /></span><span><b>王国模式</b><small>像玩游戏一样学算法</small></span></button><div className="topic-group"><button type="button" className={`topic-toggle ${active !== 'home' ? 'active' : ''}`} aria-expanded={topicExpanded} onClick={() => setTopicExpanded(value => !value)}><span className="nav-icon purple"><Layers3 size={16} /></span><span><b>算法</b><small>按《算法导论》章节组织</small></span><ChevronDown className={topicExpanded ? 'topic-chevron expanded' : 'topic-chevron'} size={15} /></button>{topicExpanded && <div className="topic-children">{algorithmParts.map(part => <div className="part-group" key={part.id}><div className="part-label">{part.label}</div>{part.chapters.map(chapter => <div className="chapter-group" key={chapter.id}><div className="chapter-label"><b>{chapter.label}</b><span>{chapter.title}</span></div>{chapter.lessons.map(item => <button type="button" key={item.id} className={`nav-item nested ${active === item.id ? 'active' : ''}`} aria-current={active === item.id ? 'page' : undefined} onClick={() => setActive(item.id)}><span className={`nav-icon ${item.color}`}><Layers3 size={15} /></span><span><b>{item.label}</b><small>{item.detail}</small></span>{item.status === 'dev' && <span className="lesson-badge">DEV</span>}</button>)}</div>)}</div>)}</div>}</div></nav><div className="sidebar-footer"><span className="status-dot" />本地静态站点<br /><small>React 19.3 · Anime.js 4.5 · KaTeX 0.18.7</small></div></aside><main className="site-main"><header className="site-topbar"><div className="crumb"><BookOpen size={15} />算法动画站 <span>/</span> {active === 'home' ? '主页' : active === 'kingdom' ? '算法王国' : `算法 / ${activeChapter?.label ?? ''} ${activeLesson?.label ?? '课程'}`}</div></header>{active === 'home' ? <HomePage onOpenLesson={openLesson} /> : active === 'kingdom' ? <div className="lesson-page"><GameApp /></div> : <div className="lesson-page">{lessonContent}</div>}</main></div>
}
