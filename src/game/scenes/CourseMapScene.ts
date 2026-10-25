import { Container, Graphics } from 'pixi.js'
import type { Game, GameAction, GameScene } from '../core/app'
import { C, MONO, makeButton, makePanel, makeText } from '../core/ui'
import {
  chapters,
  completedMissions,
  missionsIn,
  sources,
  type ChapterId,
} from '../curriculum'
import { t, zh } from '../locale'
import { CourseScene } from './CourseScene'
import { MapScene } from './MapScene'
import { LabScene } from './LabScene'
import { ClassroomScene } from './ClassroomScene'

export class CourseMapScene implements GameScene {
  readonly container = new Container()
  readonly backdropAlpha = 0.65
  size = { width: 1440, height: 800 }
  private lastWidth = 0
  private page = 0

  constructor(
    private game: Game,
    private chapter: ChapterId = 'foundations',
  ) {
    this.resize(game.width)
  }

  resize(width: number) {
    const w = Math.max(320, Math.round(width))
    if (w === this.lastWidth) return
    this.lastWidth = w
    this.size = {
      width: w,
      height: w < 760 ? 1110 : Math.max(830, (w * 800) / 1440),
    }
    this.draw()
  }

  private choose(chapter: ChapterId) {
    this.chapter = chapter
    this.page = 0
    this.draw()
  }
  private movePage(delta: number) {
    const pages = Math.max(1, Math.ceil(missionsIn(this.chapter).length / 6))
    this.page = (this.page + delta + pages) % pages
    this.draw()
  }

  private draw() {
    this.container
      .removeChildren()
      .forEach((child) => child.destroy({ children: true }))
    const { width: w, height: h } = this.size
    const mobile = w < 760
    const done = completedMissions()
    const left = mobile ? 20 : Math.min(288, w * 0.26)
    const wide = mobile ? w - 40 : w - left - 36
    const all = missionsIn(this.chapter)
    const selected = zh.course.chapters[this.chapter]
    const actions: GameAction[] = [
      {
        label: t('course.overview'),
        run: () => this.game.switch((g) => new MapScene(g)),
      },
      ...chapters.map((chapter) => ({
        label: zh.course.chapters[chapter].title,
        run: () => this.choose(chapter),
      })),
      ...all.map((mission) => ({
        label: zh.course.missions[mission.id]?.title ?? mission.id,
        run: () => this.game.switch((g) => new CourseScene(g, mission)),
      })),
      { label: t('course.previousPage'), run: () => this.movePage(-1) },
      { label: t('course.nextPage'), run: () => this.movePage(1) },
    ]
    actions.push({ label: t('lab.entry'), run: () => this.game.switch(g => new LabScene(g)) })
    actions.push({ label: t('classroom.entry'), run: () => this.game.switch(g => new ClassroomScene(g)) })
    this.game.setActions(actions)

    if (!mobile) {
      makeText(this.container, 32, 30, 'COURSE / NAVIGATION', {
        size: 10,
        family: MONO,
        color: C.yellow,
      })
      chapters.forEach((chapter, index) => {
        const node = new Container()
        node.position.set(24, 74 + index * 40)
        const active = chapter === this.chapter
        const bg = new Graphics()
          .rect(0, 0, left - 48, 37)
          .fill({
            color: active ? 0x193239 : C.bg,
            alpha: active ? 0.95 : 0.01,
          })
        if (active) bg.rect(0, 0, 2, 37).fill(C.yellow)
        node.addChild(bg)
        makeText(node, 12, 12, String(index + 1).padStart(2, '0'), {
          size: 10,
          family: MONO,
          color: active ? C.yellow : C.faint,
        })
        makeText(node, 42, 9, zh.course.chapters[chapter].title, {
          size: 14,
          color: active ? C.ink : C.muted,
        })
        node.eventMode = 'static'
        node.cursor = 'pointer'
        node.on('pointertap', () => this.choose(chapter))
        this.container.addChild(node)
      })
      makeButton(this.container, {
        x: 32,
        y: h - 121,
        w: left - 76,
        h: 40,
        label: t('classroom.entry'),
        onTap: () => this.game.switch(g => new ClassroomScene(g)),
      })
      makeButton(this.container, {
        x: 32,
        y: h - 72,
        w: left - 76,
        h: 40,
        label: t('course.overview'),
        variant: 'outline',
        onTap: () => this.game.switch((g) => new MapScene(g)),
      })
      const line = new Graphics()
        .moveTo(left - 20, 30)
        .lineTo(left - 20, h - 30)
        .stroke({ width: 1, color: C.border })
      this.container.addChild(line)
    }

    makeText(this.container, left, 36, selected.en, {
      size: 11,
      family: MONO,
      color: C.yellow,
    })
    makeText(this.container, left, 69, selected.title, {
      size: mobile ? 27 : 34,
      weight: '400',
    })
    makeText(this.container, left, 119, selected.note, {
      size: 14,
      color: C.muted,
      wordWrap: wide,
      lineHeight: 24,
    })
    if (mobile) {
      const index = chapters.indexOf(this.chapter)
      makeButton(this.container, {
        x: left,
        y: 171,
        w: wide / 2 - 5,
        h: 44,
        label: `← ${zh.course.chapters[chapters[(index + chapters.length - 1) % chapters.length]].title.split(' · ')[1]}`,
        variant: 'outline',
        size: 13,
        onTap: () =>
          this.choose(
            chapters[(index + chapters.length - 1) % chapters.length],
          ),
      })
      makeButton(this.container, {
        x: left + wide / 2 + 5,
        y: 171,
        w: wide / 2 - 5,
        h: 44,
        label: `${zh.course.chapters[chapters[(index + 1) % chapters.length]].title.split(' · ')[1]} →`,
        variant: 'outline',
        size: 13,
        onTap: () => this.choose(chapters[(index + 1) % chapters.length]),
      })
    } else {
      makeText(
        this.container,
        w - 36,
        46,
        t('course.completed', {
          n: all.filter((m) => done.includes(m.id)).length,
          total: all.length,
        }),
        { size: 12, anchorX: 1, color: C.muted },
      )
    }

    if (!mobile) makeButton(this.container, { x: w - 200, y: 96, w: 164, h: 40, label: t('lab.entry'), onTap: () => this.game.switch(g => new LabScene(g)) })
    const startY = mobile ? 254 : 181
    const baseHeight = mobile ? 1110 : Math.max(830, w * 800 / 1440)
    let rowY = startY
    all.slice(this.page * 6, this.page * 6 + 6).forEach((mission, index) => {
      const copy = zh.course.missions[mission.id]
      const y = rowY
      const row = new Container()
      row.position.set(left, y)
      const bg = new Graphics()
      row.addChild(bg)
      const completed = done.includes(mission.id)
      makeText(
        row,
        18,
        19,
        completed ? '✓' : String(this.page * 6 + index + 1).padStart(2, '0'),
        {
          size: mobile ? 15 : 18,
          family: MONO,
          color: completed ? C.green : C.yellow,
        },
      )
      const title = makeText(row, 58, 15, copy?.title ?? mission.id, {
        size: mobile ? 16 : 18,
        wordWrap: wide - 95,
        lineHeight: 25,
      })
      const description = makeText(row, 58, 15 + title.height + 8, copy?.objective ?? '', {
        size: mobile ? 12 : 12,
        color: C.muted,
        wordWrap: wide - 110,
        lineHeight: 18,
      })
      const rowHeight = Math.max(mobile ? 92 : 70, description.y + description.height + 15)
      bg.rect(0, 0, wide, rowHeight).fill({ color: 0x09191e, alpha: 0.92 })
      bg.moveTo(0, rowHeight).lineTo(wide, rowHeight).stroke({ width: 1, color: C.border })
      rowY += rowHeight + 8
      makeText(row, wide - 20, 22, '↗', {
        size: 20,
        anchorX: 1,
        color: C.yellow,
      })
      row.eventMode = 'static'
      row.cursor = 'pointer'
      row.on('pointerover', () => {
        bg.tint = 0xc9e5e5
      })
      row.on('pointerout', () => {
        bg.tint = 0xffffff
      })
      row.on('pointertap', () =>
        this.game.switch((g) => new CourseScene(g, mission)),
      )
      this.container.addChild(row)
    })
    const pages = Math.max(1, Math.ceil(all.length / 6))
    const controlsY = Math.max(mobile ? 886 : baseHeight - 84, rowY + 16)
    if (pages > 1) {
      makeButton(this.container, {
        x: left,
        y: controlsY,
        w: 104,
        h: 44,
        label: t('course.previousPage'),
        variant: 'outline',
        onTap: () => this.movePage(-1),
      })
      makeText(
        this.container,
        left + wide / 2,
        controlsY + 15,
        t('course.page', { n: this.page + 1, total: pages }),
        { size: 12, family: MONO, color: C.muted, anchorX: 0.5 },
      )
      makeButton(this.container, {
        x: left + wide - 104,
        y: controlsY,
        w: 104,
        h: 44,
        label: t('course.nextPage'),
        variant: 'outline',
        onTap: () => this.movePage(1),
      })
    }
    makeText(
      this.container,
      left,
      controlsY + 70,
      t('course.sourceNote'),
      { size: 11, color: C.faint, wordWrap: wide, lineHeight: 19 },
    )
    if (mobile)
      makeText(
        this.container,
        left,
        controlsY + 118,
        Object.values(sources)
          .map((source) => source.code)
          .join(' / '),
        {
          size: 10,
          family: MONO,
          color: C.faint,
          wordWrap: wide,
          lineHeight: 18,
        },
      )
    this.size.height = Math.max(baseHeight, controlsY + (mobile ? 200 : 120))
    this.game.updateLayout()
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
