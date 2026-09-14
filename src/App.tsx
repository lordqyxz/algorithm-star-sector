import { useState, type ComponentType } from 'react'
import { BookOpen, Compass, Map as MapIcon, Route, Sparkles } from 'lucide-react'
import { chapterCatalog, algorithmParts } from '@/content'
import { VoyageLog } from '@/components/VoyageLog'
import { PlaceholderLesson } from '@/components/PlaceholderLesson'
import { GameHost } from '@/components/GameHost'
import { StarField } from '@/components/StarField'
import { StarMapNav } from '@/components/StarMapNav'
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
  const [navOpen, setNavOpen] = useState(false)
  const activeLesson = chapterCatalog.flatMap(chapter => chapter.lessons).find(item => item.id === active)
  const activeChapter = chapterCatalog.find(chapter => chapter.lessons.some(item => item.id === active))
  const activePart = algorithmParts.find(part => part.chapters.some(chapter => chapter.id === activeChapter?.id))
  const openLesson = (id: string) => setActive(id)
  const ActiveLesson = activeLesson && lessonRegistry[active]
  const lessonContent = activeLesson?.status === 'dev' || !ActiveLesson
    ? <PlaceholderLesson partLabel={activePart?.label ?? '算法'} chapterLabel={activeChapter?.label ?? ''} chapterTitle={activeChapter?.title ?? ''} lessonLabel={activeLesson?.label ?? ''} detail={activeLesson?.detail ?? ''} />
    : <ActiveLesson />

  return <div className="site-shell">
    <StarField />
    <header className="hud-bar">
      <div className="hud-brand"><span className="hud-mark"><Sparkles size={15} /></span><div><strong>Algorithm</strong><span>STAR SECTOR · 算法星域</span></div></div>
      <nav className="hud-nav" aria-label="站点主题导航">
        <button type="button" className={`hud-chip \${active === 'kingdom' ? 'active' : ''}`} aria-current={active === 'kingdom' ? 'page' : undefined} onClick={() => setActive('kingdom')}><Route size={14} />星域</button>
        <button type="button" className={`hud-chip ${active === 'log' ? 'active' : ''}`} aria-current={active === 'log' ? 'page' : undefined} onClick={() => setActive('log')}><Compass size={14} />航行日志</button>
        <button type="button" className="hud-chip" onClick={() => setNavOpen(true)}><MapIcon size={14} />星图导航</button>
      </nav>
    </header>
    <main className="site-main">
      {active === 'log'
        ? <VoyageLog onOpenLesson={openLesson} onOpenGame={() => setActive('kingdom')} />
        : active === 'kingdom'
          ? <div className="game-page"><GameHost /></div>
          : <div className="lesson-page">
              <p className="crumb"><BookOpen size={13} />算法星域 <span>/</span> 沙盘推演 <span>/</span> {activeChapter?.label ?? ''} {activeLesson?.label ?? ''}</p>
              {lessonContent}
            </div>}
      <footer className="site-footer">
        <span>© 2026 中国科学院大学 UCAS · 博学笃志 格物明德</span>
        <span>Built by <a href="https://github.com/shiyz" target="_blank" rel="noreferrer">GitHub @shiyz</a></span>
        <span>许可：CC BY-NC 4.0 · 禁止商用 · 转载需署名</span><span>天文学数据参考：NASA / ESA / Gaia DR3 公开资料</span>
      </footer>
    </main>
    {navOpen ? <StarMapNav active={active} onClose={() => setNavOpen(false)} onOpenLesson={openLesson} onOpenGame={() => setActive('kingdom')} /> : null}
  </div>
}
