import { useState, type ComponentType } from 'react'
import { BookOpen, Home, Route, Sparkles } from 'lucide-react'
import { chapterCatalog, algorithmParts } from '@/content'
import { HomePage } from '@/components/HomePage'
import { PlaceholderLesson } from '@/components/PlaceholderLesson'
import { GameHost } from '@/components/GameHost'
import { AlgorithmRoleLesson } from '@/lessons/algorithm-role'
import { AsymptoticNotationLesson } from '@/lessons/asymptotic-notation'
import { BinarySearchLesson } from '@/lessons/binary-search'
import { BucketSortLesson } from '@/lessons/bucket-sort'
import { ClosestPairLesson } from '@/lessons/closest-pair'
import { CountingSortLesson } from '@/lessons/counting-sort'
import { HeapSortLesson } from '@/lessons/heap-sort'
import { HiringProblemLesson } from '@/lessons/hiring-problem'
import { InsertionSortLesson } from '@/lessons/insertion-sort'
import { MasterMethodLesson } from '@/lessons/master-method'
import { MaximumSubarrayLesson } from '@/lessons/maximum-subarray'
import { MedianOfMediansLesson } from '@/lessons/median-of-medians'
import { MergeSortLesson } from '@/lessons/merge-sort'
import { OrderStatisticsLesson } from '@/lessons/order-statistics'
import { PriorityQueueLesson } from '@/lessons/priority-queue'
import { QuickSortLesson } from '@/lessons/quick-sort'
import { RadixSortLesson } from '@/lessons/radix-sort'
import { RandomizedAlgorithmsLesson } from '@/lessons/randomized-algorithms'
import { RandomizedQuickSortLesson } from '@/lessons/randomized-quicksort'
import { RecurrenceEquationsLesson } from '@/lessons/recurrence-equations'
import { StrassenLesson } from '@/lessons/strassen'

/** 沙盘注册表：新沙盘建成后在此登记（content.ts 同步把 status 改为 ready）。 */
const lessonRegistry: Record<string, ComponentType> = {
  'algorithm-role': AlgorithmRoleLesson,
  'asymptotic-notation': AsymptoticNotationLesson,
  'binary-search': BinarySearchLesson,
  'bucket-sort': BucketSortLesson,
  'counting-sort': CountingSortLesson,
  'divide-conquer': ClosestPairLesson,
  'heap-sort': HeapSortLesson,
  'hiring-problem': HiringProblemLesson,
  'insertion-sort': InsertionSortLesson,
  'master-method': MasterMethodLesson,
  'maximum-subarray': MaximumSubarrayLesson,
  'median-of-medians': MedianOfMediansLesson,
  'merge-sort': MergeSortLesson,
  'order-statistics': OrderStatisticsLesson,
  'priority-queue': PriorityQueueLesson,
  'quick-sort': QuickSortLesson,
  'radix-sort': RadixSortLesson,
  'randomized-algorithms': RandomizedAlgorithmsLesson,
  'randomized-quicksort': RandomizedQuickSortLesson,
  'recurrence-equations': RecurrenceEquationsLesson,
  'strassen': StrassenLesson,
}

export default function App() {
  const [active, setActive] = useState('kingdom')
  const activeLesson = chapterCatalog.flatMap(chapter => chapter.lessons).find(item => item.id === active)
  const activeChapter = chapterCatalog.find(chapter => chapter.lessons.some(item => item.id === active))
  const activePart = algorithmParts.find(part => part.chapters.some(chapter => chapter.id === activeChapter?.id))
  const openLesson = (id: string) => setActive(id)
  const ActiveLesson = activeLesson && lessonRegistry[active]
  const lessonContent = activeLesson?.status === 'dev' || !ActiveLesson
    ? <PlaceholderLesson partLabel={activePart?.label ?? '算法'} chapterLabel={activeChapter?.label ?? ''} chapterTitle={activeChapter?.title ?? ''} lessonLabel={activeLesson?.label ?? ''} detail={activeLesson?.detail ?? ''} />
    : <ActiveLesson />

  return <div className="site-shell"><aside className="site-sidebar"><div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><div><strong>Algorithm</strong><span>Animation Studio</span></div></div><div className="sidebar-label">WORKSPACE</div><nav className="lesson-nav" aria-label="站点主题导航"><button type="button" className={`nav-item ${active === 'kingdom' ? 'active' : ''}`} aria-current={active === 'kingdom' ? 'page' : undefined} onClick={() => setActive('kingdom')}><span className="nav-icon green"><Route size={16} /></span><span><b>算法王国</b><small>像玩游戏一样学算法</small></span></button><button type="button" className={`nav-item ${active === 'home' ? 'active' : ''}`} aria-current={active === 'home' ? 'page' : undefined} onClick={() => setActive('home')}><span className="nav-icon slate"><Home size={16} /></span><span><b>学院</b><small>沙盘推演总览与路线</small></span></button></nav><div className="sidebar-footer"><span className="status-dot" />本地静态站点<br /><small>React 19.3 · Anime.js 4.5 · KaTeX 0.18.7</small></div></aside><main className="site-main"><header className="site-topbar"><div className="crumb"><BookOpen size={15} />算法动画站 <span>/</span> {active === 'home' ? '学院 · 沙盘推演' : active === 'kingdom' ? '算法王国' : `沙盘推演 / ${activeChapter?.label ?? ''} ${activeLesson?.label ?? ''}`}</div></header>{active === 'home' ? <HomePage onOpenLesson={openLesson} /> : active === 'kingdom' ? <div className="lesson-page"><GameHost /></div> : <div className="lesson-page">{lessonContent}</div>}</main></div>
}
