import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { GameHost } from './GameHost'
import { t } from '@/game/locale'

/** Native dialog owns focus; all course navigation inside remains owned by Pixi. */
export function StarMapNav({ onClose }: { onClose: () => void; onOpenGame?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className="star-map" aria-modal="true" aria-label={t('hud.navMap')} onCancel={onClose}>
    <header className="star-map-head">
      <div><p className="eyebrow">{t('hud.starMapEyebrow')}</p><h3>{t('hud.navMap')}</h3></div>
      <button className="star-map-close" onClick={onClose} aria-label={t('course.closeMap')}><X size={18} /></button>
    </header>
    <GameHost mode="overview" />
  </dialog>
}
