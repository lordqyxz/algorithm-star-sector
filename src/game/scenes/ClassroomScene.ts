import { Container, Graphics } from 'pixi.js'
import type { Game, GameAction, GameScene } from '../core/app'
import { C, MONO, makeButton, makePanel, makeText } from '../core/ui'
import { classroomSources, classroomUnits, type ClassroomUnit } from '../classroom'
import { completedMissions } from '../curriculum'
import { courseMissions } from '../sim'
import { t, zh } from '../locale'
import { CourseScene } from './CourseScene'
import { MapScene } from './MapScene'

type UnitId = ClassroomUnit['id']
const copy = zh.classroom
const word = (key: Parameters<typeof t>[0], vars?: Record<string, string | number>) =>
  t(key, vars)

/** The private lecture files are cited by physical page, never bundled or linked. */
export class ClassroomScene implements GameScene {
  readonly container = new Container()
  readonly backdropAlpha = 0.65
  size = { width: 1440, height: 940 }
  private lastWidth = 0
  private page = 0
  private unit: ClassroomUnit

  constructor(private game: Game, unitId: UnitId = 'c01') {
    this.unit = classroomUnits.find(unit => unit.id === unitId) ?? classroomUnits[0]
    this.resize(game.width)
  }

  resize(width: number) {
    const w = Math.max(320, Math.round(width))
    if (w === this.lastWidth) return
    this.lastWidth = w
    this.size.width = w
    this.draw()
  }

  private choose(unit: ClassroomUnit) {
    this.unit = unit
    this.page = 0
    this.draw()
  }

  private movePage(delta: number) {
    const pages = Math.max(1, Math.ceil(this.unit.missions.length / 6))
    this.page = (this.page + delta + pages) % pages
    this.draw()
  }

  private open(id: string) {
    const mission = courseMissions.find(item => item.id === id)
    if (mission) this.game.switch(game => new CourseScene(game, mission, this.unit.id))
  }

  private draw() {
    this.container.removeChildren().forEach(child => child.destroy({ children: true }))
    const w = this.size.width
    const compact = w < 900
    const pad = compact ? 20 : 32
    const railW = compact ? 220 : 266
    const mainX = pad + railW + 28
    const mainW = Math.max(300, w - mainX - pad)
    const source = classroomSources.find(item => item.id === this.unit.sourceId)!
    const completed = new Set(completedMissions())
    const references = this.unit.missions
    const pages = Math.max(1, Math.ceil(references.length / 6))
    const unitCopy = copy.units[this.unit.id]
    const chapterTitle = unitCopy.title

    const actions: GameAction[] = [
      { label: word('course.overview'), run: () => this.game.switch(game => new MapScene(game)) },
      ...classroomUnits.map(unit => ({ label: copy.units[unit.id].title, run: () => this.choose(unit) })),
      ...references.map(ref => ({
        label: zh.course.missions[ref.id as keyof typeof zh.course.missions]?.title ?? ref.id,
        run: () => this.open(ref.id),
      })),
      { label: word('course.previousPage'), run: () => this.movePage(-1) },
      { label: word('course.nextPage'), run: () => this.movePage(1) },
    ]
    this.game.setActions(actions)
    this.game.setDescription(word('classroom.description', {
      unit: chapterTitle,
      file: source.file,
      pages: source.pages,
      range: references.map(ref => ref.pages.join(', ')).join('; '),
    }))

    makeText(this.container, pad, 30, word('classroom.kicker'), {
      size: 11, family: MONO, color: C.yellow,
    })
    makeText(this.container, pad, 57, word('classroom.heading'), {
      size: 32, weight: '400', color: C.ink,
    })
    makeText(this.container, pad, 105, word('classroom.intro'), {
      size: 13, color: C.muted, wordWrap: w - pad * 2, lineHeight: 20,
    })

    const railY = 157
    const railRow = 35
    const railH = 17 * railRow + 96
    makePanel(this.container, pad, railY, railW, railH, { alpha: 0.88 })
    makeText(this.container, pad + 16, railY + 17, word('classroom.unitList'), {
      size: 11, family: MONO, color: C.yellow,
    })
    classroomUnits.forEach((unit, index) => {
      const row = new Container()
      row.position.set(pad + 8, railY + 47 + index * railRow)
      const active = unit.id === this.unit.id
      const bg = new Graphics()
        .roundRect(0, 0, railW - 16, railRow - 3, 2)
        .fill({ color: active ? C.blueBg : C.panel, alpha: active ? 0.96 : 0.01 })
      if (active) bg.rect(0, 0, 2, railRow - 3).fill(C.yellow)
      row.addChild(bg)
      makeText(row, 11, 9, unit.number === null ? '—' : String(unit.number).padStart(2, '0'), {
        size: 10, family: MONO, color: active ? C.yellow : C.faint,
      })
      makeText(row, 40, 6, copy.units[unit.id].title, {
        size: 13, color: active ? C.ink : C.muted, wordWrap: railW - 62, lineHeight: 17,
      })
      row.eventMode = 'static'
      row.cursor = 'pointer'
      row.on('pointertap', () => this.choose(unit))
      this.container.addChild(row)
    })
    makeButton(this.container, {
      x: pad + 13, y: railY + railH - 48, w: railW - 26, h: 35,
      label: word('course.overview'), variant: 'outline',
      onTap: () => this.game.switch(game => new MapScene(game)),
    })

    let y = railY
    makeText(this.container, mainX, y, word('classroom.currentUnit', {
      n: this.unit.number ?? '—', total: classroomUnits.length,
    }), { size: 11, family: MONO, color: C.yellow })
    y += 30
    const title = makeText(this.container, mainX, y, chapterTitle, {
      size: 30, weight: '400', wordWrap: mainW - 225, lineHeight: 38,
    })
    y += Math.max(43, title.height + 13)
    const note = makeText(this.container, mainX, y, unitCopy.note, {
      size: 14, color: C.muted, wordWrap: mainW - 20, lineHeight: 22,
    })
    y += note.height + 21
    const count = references.filter(ref => completed.has(ref.id)).length
    const progress = makeText(this.container, mainX, y, word('classroom.sampleProgress', {
      n: count, total: references.length,
    }), { size: 12, color: C.blue })
    y += progress.height + 23

    const listLabel = makeText(this.container, mainX, y, word('classroom.missionList'), {
      size: 11, family: MONO, color: C.yellow,
    })
    y += listLabel.height + 16
    references.slice(this.page * 6, this.page * 6 + 6).forEach((ref, index) => {
      const missionCopy = zh.course.missions[ref.id as keyof typeof zh.course.missions]
      const row = new Container()
      row.position.set(mainX, y)
      const bg = new Graphics()
      row.addChild(bg)
      const innerX = 55
      const contentW = mainW - innerX - 26
      makeText(row, 17, 18, completed.has(ref.id) ? '✓' : String(this.page * 6 + index + 1).padStart(2, '0'), {
        size: 15, family: MONO, color: completed.has(ref.id) ? C.green : C.yellow,
      })
      const titleText = makeText(row, innerX, 15, missionCopy?.title ?? ref.id, {
        size: 17, color: C.ink, wordWrap: contentW - 130, lineHeight: 24,
      })
      makeText(row, mainW - 18, 19,
        ref.emphasis === 'core' ? word('classroom.core') : word('classroom.extension'), {
          size: 11, anchorX: 1, color: ref.emphasis === 'core' ? C.yellow : C.blue,
        })
      const objectiveY = Math.max(47, titleText.y + titleText.height + 6)
      const objective = makeText(row, innerX, objectiveY, missionCopy?.objective ?? '', {
        size: 12, color: C.muted, wordWrap: contentW, lineHeight: 19,
      })
      const pagesY = objective.y + objective.height + 9
      const pageText = makeText(row, innerX, pagesY, word(
        source.kind === 'doc' ? 'classroom.documentPages' : 'classroom.slidePages',
        { pages: ref.pages.join(', ') },
      ), { size: 11, family: MONO, color: C.blue, wordWrap: contentW, lineHeight: 17 })
      const rowH = Math.max(98, pageText.y + pageText.height + 15)
      bg.roundRect(0, 0, mainW, rowH, 3).fill({ color: C.panel, alpha: 0.91 })
      bg.roundRect(0, 0, mainW, rowH, 3).stroke({ width: 1, color: C.border })
      makeText(row, mainW - 19, rowH - 31, '↗', { size: 18, color: C.yellow, anchorX: 1 })
      row.eventMode = 'static'
      row.cursor = 'pointer'
      row.on('pointertap', () => this.open(ref.id))
      this.container.addChild(row)
      y += rowH + 9
    })

    if (pages > 1) {
      y += 7
      makeButton(this.container, {
        x: mainX, y, w: 116, h: 39, label: word('course.previousPage'), variant: 'outline',
        onTap: () => this.movePage(-1),
      })
      makeText(this.container, mainX + mainW / 2, y + 12,
        word('course.page', { n: this.page + 1, total: pages }), {
          size: 12, family: MONO, color: C.muted, anchorX: 0.5,
        })
      makeButton(this.container, {
        x: mainX + mainW - 116, y, w: 116, h: 39,
        label: word('course.nextPage'), variant: 'outline',
        onTap: () => this.movePage(1),
      })
      y += 55
    }

    const sourceY = Math.max(y + 18, railY + railH - 61)
    makePanel(this.container, mainX, sourceY, mainW, 83, { alpha: 0.76 })
    makeText(this.container, mainX + 15, sourceY + 12, word('classroom.sourceLabel'), {
      size: 10, color: C.yellow, family: MONO,
    })
    makeText(this.container, mainX + 15, sourceY + 31,
      word('classroom.sourceLine', { file: source.file, pages: source.pages }), {
        size: 12, color: C.ink, wordWrap: mainW - 30, lineHeight: 18,
      })
    makeText(this.container, mainX + 15, sourceY + 61, word('classroom.localSourceNote'), {
      size: 11, color: C.faint, wordWrap: mainW - 30,
    })
    this.size.height = Math.max(940, sourceY + 117)
    this.game.updateLayout()
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
