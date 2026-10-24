import { useState } from 'react'
import { Compass, Map as MapIcon, Orbit, BookOpen } from 'lucide-react'
import { VoyageLog } from '@/components/VoyageLog'
import { GameHost } from '@/components/GameHost'
import { StarField } from '@/components/StarField'
import { StarMapNav } from '@/components/StarMapNav'
import { t } from '@/game/locale'

/** 站点外壳：星域游戏 / 航行日志 / 关卡星图。所有文案走 locale 词表。 */
export default function App() {
  const [active, setActive] = useState<'overview' | 'course' | 'log'>('overview')
  const [navOpen, setNavOpen] = useState(false)
  const [entry, setEntry] = useState(0)
  const navigate = (target: 'overview' | 'course') => { setActive(target); setEntry(value => value + 1) }

  return <div className="site-shell">
    <StarField />
    <a className="skip-link" href="#main-content">{t('course.skip')}</a>
    <header className="hud-bar">
      <button className="hud-brand" onClick={() => navigate('overview')}><span className="hud-mark"><Orbit size={26} strokeWidth={1} /></span><span><strong>{t('hud.brandTitle')}</strong><small>{t('hud.brandSubtitle')}</small></span></button>
      <nav className="hud-nav" aria-label={t('hud.navAria')}>
        <button type="button" className={`hud-chip ${active === 'overview' ? 'active' : ''}`} aria-current={active === 'overview' ? 'page' : undefined} onClick={() => navigate('overview')}><Orbit size={15} />{t('hud.navGame')}</button>
        <button type="button" className={`hud-chip ${active === 'course' ? 'active' : ''}`} aria-current={active === 'course' ? 'page' : undefined} onClick={() => navigate('course')}><BookOpen size={15} />{t('course.title')}</button>
        <button type="button" className={`hud-chip ${active === 'log' ? 'active' : ''}`} aria-current={active === 'log' ? 'page' : undefined} onClick={() => setActive('log')}><Compass size={14} />{t('hud.navLog')}</button>
        <button type="button" className="hud-chip" aria-haspopup="dialog" aria-expanded={navOpen} onClick={() => setNavOpen(true)}><MapIcon size={14} />{t('hud.navMap')}</button>
      </nav>
      <span className="hud-status"><i />{t('course.ready')}</span>
    </header>
    <main className="site-main" id="main-content">
      {active === 'log'
        ? <VoyageLog onOpenGame={() => navigate('course')} />
        : <div className="game-page"><GameHost key={entry} mode={active} /></div>}
      <footer className="site-footer">
        <span>{t('hud.footerCopy')}</span>
        <span>{t('hud.footerBuiltBy')} <a href="https://github.com/lordqyxz" target="_blank" rel="noreferrer">GitHub @lordqyxz</a></span>
        <span>{t('hud.footerLicense')}</span>
        <a href="https://jwba.ucas.ac.cn/sc/course/courseplan/234252" target="_blank" rel="noreferrer">{t('course.archive')}</a>
      </footer>
    </main>
    {navOpen ? <StarMapNav onClose={() => setNavOpen(false)} /> : null}
  </div>
}
