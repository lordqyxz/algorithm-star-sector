import { chapterCatalog } from '@/content'
import { LessonIcon } from '@/components/LessonIcon'
import { gameLevels } from '@/game/levels'
import { lyOf, nextMilestone, rankOf } from '@/game/core/xp'
import { loadSave } from '@/game/save'
import { medalNames } from '@/game/sim'
import { ArrowRight, Compass, Route } from 'lucide-react'

/**
 * 航行日志：取代传统"学院"页。指挥官档案（里程/称号）、航段记录（游戏关卡）、
 * 研究档案（21 个沙盘推演）统一在一本日志里。
 * 图片约定：public/astro/{banner,leg-1..4}.jpg，缺失时自动回退为程序化深空视觉。
 */
export function VoyageLog({ onOpenLesson, onOpenGame }: { onOpenLesson: (id: string) => void; onOpenGame: () => void }) {
  const save = loadSave()
  const ly = lyOf(save, gameLevels)
  const rank = rankOf(ly)
  const milestone = nextMilestone(ly)

  return <div className="voyage-log">
    <div className="voyage-banner">
      <img src="/astro/banner.jpg" alt="" onError={event => { event.currentTarget.style.display = 'none' }} />
      <div className="voyage-banner-veil" aria-hidden="true" />
      <div className="voyage-banner-copy">
        <p className="eyebrow">MISSION CONTROL</p>
        <h2>航行日志</h2>
        <p>博学笃志，格物明德——每一光年的航程，都记录在案。</p>
      </div>
    </div>

    <section className="voyage-panel">
      <h3><Compass size={15} />指挥官档案</h3>
      <div className="voyage-stats">
        <div className="voyage-stat"><span>航行里程</span><strong>{ly.toFixed(2)}</strong><small>光年（按最佳奖章折算）</small></div>
        <div className="voyage-stat"><span>当前称号</span><strong className="rank">{rank.title}</strong><small>{rank.note}</small></div>
        <div className="voyage-stat"><span>下一站</span><strong className="next">{milestone ? milestone.title : '—'}</strong><small>{milestone ? `${milestone.note} · 还需 ${(milestone.at - ly).toFixed(2)} 光年` : '太阳邻域全部点亮'}</small></div>
        <button type="button" className="voyage-continue" onClick={onOpenGame}><Route size={14} />继续航行</button>
      </div>
    </section>

    <section className="voyage-panel">
      <h3><Route size={15} />航段记录 · 太阳邻域</h3>
      <div className="voyage-legs">
        {gameLevels.map((level, index) => {
          const record = save[level.variants[0]?.id ?? '']
          return <button type="button" key={level.id} className="voyage-leg" onClick={onOpenGame}>
            <span className="voyage-leg-thumb">
              <img src={`/astro/leg-${index + 1}.jpg`} alt="" onError={event => { event.currentTarget.style.display = 'none' }} />
            </span>
            <span className="voyage-leg-copy"><b>{level.title}</b><small>{level.destination} · {level.ly} 光年</small></span>
            <span className="voyage-leg-meta">{record ? `${medalNames[record.medal]} · 航程 ${(level.ly * ({ gold: 1, silver: 0.6, bronze: 0.3 } as const)[record.medal]).toFixed(2)} 光年` : '未点亮'}</span>
            <ArrowRight size={14} />
          </button>
        })}
      </div>
      <small className="voyage-note">奖章系数：金 ×1 · 银 ×0.6 · 铜 ×0.3——重玩高奖章即可提升里程。</small>
    </section>

    <section className="voyage-panel">
      <h3><Compass size={15} />研究档案 · 沙盘推演（21）</h3>
      <div className="voyage-archives">
        {chapterCatalog.map(chapter => <div className="voyage-chapter" key={chapter.id}>
          <h4>{chapter.label} · {chapter.title}</h4>
          <div className="voyage-chapter-links">
            {chapter.lessons.map(lesson => <button type="button" key={lesson.id} onClick={() => onOpenLesson(lesson.id)}>
              <LessonIcon id={lesson.id} size={13} />
              <span>{lesson.label}</span>
              <ArrowRight size={12} />
            </button>)}
          </div>
        </div>)}
      </div>
    </section>
  </div>
}
