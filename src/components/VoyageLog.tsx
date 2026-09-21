import { gameLevels } from '@/game/levels'
import { engineOf, lyOf, nextMilestone, rankOf, medalLyFactor, unlockedAlgos } from '@/game/core/xp'
import { loadSave } from '@/game/save'
import { t, zh, medalName, type AlgoId, type LevelId } from '@/game/locale'
import { ArrowRight, BookMarked, Compass, Route } from 'lucide-react'

/**
 * 航行日志：舰长档案（军衔/引擎/里程/下一站）+ 航段记录（游戏关卡）+ 算法图鉴。
 * 文案全部走 locale 词表；图鉴解锁态由存档派生（unlockedAlgos）。
 * 图片约定：public/astro/{banner,leg-1..4}.jpg，缺失时自动回退为程序化深空视觉。
 */
export function VoyageLog({ onOpenGame }: { onOpenGame: () => void }) {
  const save = loadSave()
  const ly = lyOf(save, gameLevels)
  const rank = rankOf(ly)
  const engine = engineOf(ly)
  const milestone = nextMilestone(ly)
  const unlocked = unlockedAlgos(save, gameLevels)
  const milestoneLabel = milestone
    ? milestone.kind === 'rank' ? zh.rank[milestone.id].title : `${zh.engine[milestone.id].name}（${zh.engine[milestone.id].speed}）`
    : ''

  return <div className="voyage-log">
    <div className="voyage-banner">
      <img src="/astro/banner.jpg" alt="" onError={event => { event.currentTarget.style.display = 'none' }} />
      <div className="voyage-banner-veil" aria-hidden="true" />
      <div className="voyage-banner-copy">
        <p className="eyebrow">{t('hud.bannerEyebrow')}</p>
        <h2>{t('hud.voyageTitle')}</h2>
        <p>{t('hud.voyageMotto')}</p>
      </div>
    </div>

    <section className="voyage-panel">
      <h3><Compass size={15} />{t('hud.captainFile')}</h3>
      <div className="voyage-stats">
        <div className="voyage-stat"><span>{t('hud.statLy')}</span><strong>{ly.toFixed(2)}</strong><small>{t('hud.statLyUnit')}</small></div>
        <div className="voyage-stat"><span>{t('hud.statRank')}</span><strong className="rank">{zh.rank[rank].title}</strong><small>{zh.rank[rank].note}</small></div>
        <div className="voyage-stat"><span>{t('hud.statEngine')}</span><strong className="rank">{zh.engine[engine].name}</strong><small>{t('hud.statEngineNote', { speed: zh.engine[engine].speed })}</small></div>
        <div className="voyage-stat"><span>{t('hud.statNext')}</span><strong className="next">{milestone ? milestoneLabel : '—'}</strong><small>{milestone ? t('hud.statNextNote', { ly: (milestone.at - ly).toFixed(2) }) : t('hud.allLit')}</small></div>
        <button type="button" className="voyage-continue" onClick={onOpenGame}><Route size={14} />{t('hud.continue')}</button>
      </div>
    </section>

    <section className="voyage-panel">
      <h3><Route size={15} />{t('hud.legsTitle')}</h3>
      <div className="voyage-legs">
        {gameLevels.map((level, index) => {
          const record = save[level.variants[0]?.id ?? '']
          const text = zh.level[level.id as LevelId]
          return <button type="button" key={level.id} className="voyage-leg" onClick={onOpenGame}>
            <span className="voyage-leg-thumb">
              <img src={`/astro/leg-${index + 1}.jpg`} alt="" onError={event => { event.currentTarget.style.display = 'none' }} />
            </span>
            <span className="voyage-leg-copy"><b>{text.title}</b><small>{text.destination} · {level.ly} 光年</small></span>
            <span className="voyage-leg-meta">{record ? t('hud.legMeta', { medal: medalName(record.medal), ly: (level.ly * medalLyFactor[record.medal]).toFixed(2) }) : t('hud.legLocked')}</span>
            <ArrowRight size={14} />
          </button>
        })}
      </div>
      <small className="voyage-note">{t('hud.medalFactorNote')}</small>
    </section>

    <section className="voyage-panel">
      <h3><BookMarked size={15} />{t('hud.dossierTitle')}</h3>
      <div className="dossier-grid">
        {(Object.keys(zh.algo) as AlgoId[]).map(algoId => {
          const algo = zh.algo[algoId]
          if (!unlocked.has(algoId)) {
            return <article key={algoId} className="dossier-card locked">
              <header><b>{t('hud.dossierLockedName')}</b><small>？？？</small></header>
              <p>{t('hud.dossierLockedHint')}</p>
            </article>
          }
          const d = zh.dossier[algoId]
          return <article key={algoId} className="dossier-card">
            <header><b>{algo.name}</b><small>{algo.en}</small><span className="dossier-badge">{t('hud.dossierArchived')}</span></header>
            <p><b>{t('ui.dossierBorn')}</b>{d.born}</p>
            <p><b>{t('ui.dossierMotive')}</b>{d.motive}</p>
            <p><b>{t('ui.dossierInsight')}</b>{d.insight}</p>
            <p><b>{t('ui.dossierAlternative')}</b>{d.alternative}</p>
            <p><b>{t('ui.dossierLegacy')}</b>{d.legacy}</p>
            <footer>{t('ui.dossierTransfer')}：{d.transfer.prompt} ✓ {d.transfer.options[d.transfer.answer]}</footer>
          </article>
        })}
      </div>
      <small className="voyage-note">{t('hud.dossierNote')}</small>
    </section>
  </div>
}
