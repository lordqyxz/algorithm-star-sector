import { Container, Graphics } from 'pixi.js'
import type { Game, GameAction, GameScene } from '../core/app'
import { C, MONO, makeButton, makePanel, makeText } from '../core/ui'
import {
  chapters,
  completedMissions,
  missionsIn,
  type ChapterId,
} from '../curriculum'
import { courseMissions } from '../sim'
import { t, zh } from '../locale'
import { loadSave } from '../save'
import { lyOf, rankOf, engineOf } from '../core/xp'
import { gameLevels } from '../levels'
import { CourseMapScene } from './CourseMapScene'
import { LegacyMapScene } from './LegacyMapScene'
import { LabScene } from './LabScene'
import { ClassroomScene } from './ClassroomScene'
import { ExperimentScene } from './ExperimentScene'

/** The overview owns chapter selection; the React shell only chooses a site entry. */
export class MapScene implements GameScene {
  readonly container = new Container()
  readonly backdropAlpha = 0.03
  size = { width: 1440, height: 800 }
  private selected: ChapterId = 'foundations'
  private page = 0
  private lastWidth = 0

  constructor(private game: Game) {
    this.resize(game.width)
  }

  resize(width: number) {
    const w = Math.max(320, Math.round(width))
    if (w === this.lastWidth) return
    this.lastWidth = w
    this.size = {
      width: w,
      height: w < 760 ? 1110 : Math.max(760, (w * 800) / 1440),
    }
    this.draw()
  }

  private open(chapter = this.selected) {
    this.game.switch((g) => new CourseMapScene(g, chapter))
  }

  private draw() {
    this.container
      .removeChildren()
      .forEach((child) => child.destroy({ children: true }))
    const { width: w, height: h } = this.size
    const mobile = w < 760
    const done = completedMissions()
    const ly = lyOf(loadSave(), gameLevels)
    const rank = rankOf(ly),
      engine = engineOf(ly)
    const pad = mobile ? 20 : 32
    const railW = mobile ? w - 40 : Math.min(252, w * 0.22)
    const centerX = mobile ? 20 : railW + 64
    const centerW = mobile ? w - 40 : w - centerX - 32
    const actions: GameAction[] = chapters.map((chapter) => ({
      label: zh.course.chapters[chapter].title,
      run: () => {
        this.selected = chapter
        this.draw()
      },
    }))
    actions.push(
      { label: t('experiment.entry'), run: () => this.game.switch(g => new ExperimentScene(g)) },
      { label: t('classroom.entry'), run: () => this.game.switch(g => new ClassroomScene(g)) },
      { label: t('course.explore'), run: () => this.open() },
      { label: t('lab.entry'), run: () => this.game.switch(g => new LabScene(g)) },
      {
        label: t('course.legacy'),
        run: () => this.game.switch((g) => new LegacyMapScene(g)),
      },
    )
    this.game.setActions(actions)

    if (mobile) {
      makeText(this.container, pad, 28, t('course.coordinates'), {
        size: 10,
        family: MONO,
        color: C.yellow,
      })
      makeText(this.container, pad, 62, t('course.universe'), {
        size: 36,
        weight: '400',
      })
      makeText(this.container, pad, 118, t('course.welcomeNote'), {
        size: 14,
        color: C.muted,
        wordWrap: w - 40,
        lineHeight: 24,
      })
      makePanel(this.container, 20, 193, w - 40, 90, { alpha: 0.82 })
      makeText(
        this.container,
        36,
        208,
        `${zh.rank[rank].title}  /  ${ly.toFixed(2)} ly`,
        { size: 15, color: C.yellow },
      )
      makeText(this.container, 36, 241, zh.engine[engine].name, {
        size: 13,
        color: C.muted,
        wordWrap: w - 72,
      })
    } else {
      makeText(this.container, centerX, 46, t('course.coordinates'), {
        size: 11,
        color: C.yellow,
        family: MONO,
      })
      makeText(this.container, centerX, 86, t('course.welcome'), {
        size: Math.min(40, w * 0.029),
        weight: '400',
        lineHeight: 58,
      })
      makeText(this.container, centerX, 220, t('course.welcomeNote'), {
        size: 14,
        color: C.muted,
        wordWrap: centerW * 0.55,
        lineHeight: 24,
      })
      makeText(
        this.container,
        w - 38,
        46,
        `${zh.rank[rank].title}  /  ${ly.toFixed(2)} ly`,
        { size: 14, anchorX: 1, color: C.yellow, family: MONO },
      )
      makeText(this.container, w - 38, 73, zh.engine[engine].name, {
        size: 12,
        anchorX: 1,
        color: C.muted,
      })
    }

    const railY = mobile ? 316 : 44
    if (!mobile)
      makePanel(this.container, 32, railY, railW, h - 88, { alpha: 0.84 })
    makeText(
      this.container,
      pad + (mobile ? 0 : 16),
      railY + (mobile ? 0 : 20),
      t('course.sectorLabel'),
      { size: 11, color: C.yellow },
    )
    const visible = mobile
      ? chapters.slice(this.page * 5, this.page * 5 + 5)
      : chapters
    visible.forEach((chapter, index) => {
      const y = railY + (mobile ? 35 : 58) + index * (mobile ? 45 : 37)
      const active = this.selected === chapter
      const row = new Container()
      row.position.set(pad, y)
      const bg = new Graphics()
        .rect(0, 0, railW, mobile ? 42 : 34)
        .fill({ color: active ? 0x1a3238 : C.bg, alpha: active ? 0.9 : 0.01 })
      if (active) bg.rect(0, 0, 2, mobile ? 42 : 34).fill(C.yellow)
      row.addChild(bg)
      makeText(
        row,
        14,
        mobile ? 11 : 8,
        String(chapters.indexOf(chapter) + 1).padStart(2, '0'),
        { size: 11, family: MONO, color: active ? C.yellow : C.faint },
      )
      makeText(row, 43, mobile ? 9 : 7, zh.course.chapters[chapter].title, {
        size: mobile ? 15 : 14,
        color: active ? C.ink : C.muted,
      })
      row.eventMode = 'static'
      row.cursor = 'pointer'
      row.on('pointertap', () => {
        this.selected = chapter
        this.draw()
      })
      this.container.addChild(row)
    })
    if (mobile) {
      makeButton(this.container, {
        x: 20,
        y: 592,
        w: 98,
        h: 44,
        label: t('course.previousPage'),
        variant: 'outline',
        onTap: () => {
          this.page = (this.page + 2) % 3
          this.draw()
        },
      })
      makeText(this.container, w / 2, 607, `${this.page + 1} / 3`, {
        size: 12,
        anchorX: 0.5,
        family: MONO,
        color: C.muted,
      })
      makeButton(this.container, {
        x: w - 118,
        y: 592,
        w: 98,
        h: 44,
        label: t('course.nextPage'),
        variant: 'outline',
        onTap: () => {
          this.page = (this.page + 1) % 3
          this.draw()
        },
      })
    }

    // Chapter nodes correspond to actual curriculum areas, connected as a suggested route.
    const routeChapters: ChapterId[] = [
      'foundations',
      'linear',
      'trees',
      'graphs',
      'dynamic',
      'optimization',
    ]
    const rx = mobile ? 44 : centerX + centerW * 0.1
    const ry = mobile ? 692 : 300
    const rw = mobile ? w - 88 : centerW * 0.82
    const rh = mobile ? 100 : Math.max(115, h - 570)
    const coords = routeChapters.map((_, i) => ({
      x: rx + (rw * i) / 5,
      y: ry + rh * (0.68 - Math.sin((i / 5) * Math.PI) * 0.55),
    }))
    const lines = new Graphics()
    coords.forEach((p, i) => {
      if (i)
        lines
          .moveTo(coords[i - 1].x, coords[i - 1].y)
          .lineTo(p.x, p.y)
          .stroke({ width: 1, color: 0x9bd8da, alpha: 0.34 })
    })
    this.container.addChild(lines)
    routeChapters.forEach((chapter, i) => {
      const p = coords[i],
        active = chapter === this.selected
      const node = new Container()
      node.position.set(p.x, p.y)
      const g = new Graphics()
      g.circle(0, 0, 24).fill({ color: C.bg, alpha: 0.02 })
      for (let r = 20; r >= 5; r -= 3)
        g.circle(0, 0, r).fill({
          color: active ? C.yellow : C.blue,
          alpha: 0.015 + 0.05 * (1 - r / 20),
        })
      g.circle(0, 0, active ? 5 : 3).fill(active ? C.yellow : C.blue)
      g.circle(0, 0, active ? 15 : 9).stroke({
        width: 1,
        color: active ? C.yellow : C.blue,
        alpha: 0.6,
      })
      node.addChild(g)
      if (!mobile || i === 0 || i === 5)
        makeText(
          node,
          0,
          i % 2 ? -44 : 26,
          zh.course.chapters[chapter].title.split(' · ')[1],
          {
            size: mobile ? 13 : 14,
            anchorX: 0.5,
            color: active ? C.yellow : C.muted,
          },
        )
      node.eventMode = 'static'
      node.cursor = 'pointer'
      node.on('pointertap', () => {
        this.selected = chapter
        this.draw()
      })
      this.container.addChild(node)
    })

    const stripY = mobile ? 848 : h - 265
    const stripH = mobile ? 236 : 188
    makePanel(this.container, centerX, stripY, centerW, stripH, {
      alpha: 0.93,
      stroke: 0x385157,
    })
    const selected = zh.course.chapters[this.selected]
    makeText(this.container, centerX + 24, stripY + 20, selected.en, {
      size: 10,
      family: MONO,
      color: C.yellow,
    })
    makeText(this.container, centerX + 24, stripY + 47, selected.title, {
      size: mobile ? 23 : 27,
      weight: '400',
    })
    makeText(this.container, centerX + 24, stripY + 91, selected.note, {
      size: 14,
      color: C.muted,
      wordWrap: centerW - 48,
    })
    const available = missionsIn(this.selected)
    makeText(
      this.container,
      centerX + 24,
      stripY + 150,
      t('course.completed', {
        n: available.filter((m) => done.includes(m.id)).length,
        total: available.length,
      }),
      { size: 11, color: C.faint },
    )
    makeButton(this.container, {
      x: mobile ? centerX + 24 : centerX + centerW - 230,
      y: mobile ? stripY + 172 : stripY + 47,
      w: mobile ? centerW - 48 : 202,
      h: 46,
      size: 14,
      label: t('classroom.entry'),
      onTap: () => this.game.switch(g => new ClassroomScene(g)),
    })
    if (!mobile) makeButton(this.container, {
      x: centerX + centerW - 230,
      y: stripY + 104,
      w: 202,
      h: 38,
      size: 13,
      label: t('course.explore'),
      variant: 'outline',
      onTap: () => this.open(),
    })
    if (!mobile) {
      makeText(
        this.container,
        centerX,
        h - 44,
        `${String(chapters.length).padStart(2, '0')}  ${t('course.sectorLabel')}     /     ${String(courseMissions.length).padStart(2, '0')}  ${t('course.missionLabel')}     /     05  ${t('course.sourceLabel')}`,
        { size: 11, color: C.muted, family: MONO },
      )
      makeButton(this.container, { x: w - 452, y: h - 61, w: 148, h: 38, label: t('experiment.entry'), onTap: () => this.game.switch(g => new ExperimentScene(g)) })
      makeButton(this.container, { x: w - 292, y: h - 61, w: 130, h: 38, label: t('lab.entry'), onTap: () => this.game.switch(g => new LabScene(g)) })
      makeButton(this.container, {
        x: w - 150,
        y: h - 61,
        w: 118,
        h: 38,
        label: t('course.legacy'),
        variant: 'outline',
        onTap: () => this.game.switch((g) => new LegacyMapScene(g)),
      })
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
