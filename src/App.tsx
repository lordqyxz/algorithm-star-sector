import { useState } from 'react'
import { Compass, Map as MapIcon, Route, Sparkles } from 'lucide-react'
import { VoyageLog } from '@/components/VoyageLog'
import { GameHost } from '@/components/GameHost'
import { StarField } from '@/components/StarField'
import { StarMapNav } from '@/components/StarMapNav'
import { t } from '@/game/locale'

/** 站点外壳：星域游戏 / 航行日志 / 关卡星图。所有文案走 locale 词表。 */
export default function App() {
  const [active, setActive] = useState<'kingdom' | 'log'>('kingdom')
  const [navOpen, setNavOpen] = useState(false)

  return <div className="site-shell">
    <StarField />
    <header className="hud-bar">
      <div className="hud-brand"><span className="hud-mark"><Sparkles size={15} /></span><div><strong>{t('hud.brandTitle')}</strong><span>{t('hud.brandSubtitle')}</span></div></div>
      <nav className="hud-nav" aria-label={t('hud.navAria')}>
        <button type="button" className={`hud-chip ${active === 'kingdom' ? 'active' : ''}`} aria-current={active === 'kingdom' ? 'page' : undefined} onClick={() => setActive('kingdom')}><Route size={14} />{t('hud.navGame')}</button>
        <button type="button" className={`hud-chip ${active === 'log' ? 'active' : ''}`} aria-current={active === 'log' ? 'page' : undefined} onClick={() => setActive('log')}><Compass size={14} />{t('hud.navLog')}</button>
        <button type="button" className="hud-chip" onClick={() => setNavOpen(true)}><MapIcon size={14} />{t('hud.navMap')}</button>
      </nav>
    </header>
    <main className="site-main">
      {active === 'log'
        ? <VoyageLog onOpenGame={() => setActive('kingdom')} />
        : <div className="game-page"><GameHost /></div>}
      <footer className="site-footer">
        <span>{t('hud.footerCopy')}</span>
        <span>{t('hud.footerBuiltBy')} <a href="https://github.com/lordqyxz" target="_blank" rel="noreferrer">GitHub @lordqyxz</a></span>
        <span>{t('hud.footerLicense')}</span>
        <span>{t('hud.footerAstro')}</span>
      </footer>
    </main>
    {navOpen ? <StarMapNav onClose={() => setNavOpen(false)} onOpenGame={() => setActive('kingdom')} /> : null}
  </div>
}
