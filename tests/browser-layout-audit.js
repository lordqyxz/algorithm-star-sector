async (
  page,
  catalog,
  { url = 'http://127.0.0.1:4173/', width = 1280 } = {},
) => {
  await page.addInitScript(() => {
    window.__PIXI_APP_INIT__ = (app) => {
      window.__auditApp = app
    }
  })
  await page.goto(url)
  await page.setViewportSize({ width, height: 1000 })
  await page.getByRole('button', { name: '课程航线', exact: true }).click()
  await page
    .locator('.game-accessible-actions button')
    .first()
    .waitFor({ state: 'attached' })
  return page.evaluate(async (catalog) => {
    localStorage.removeItem('algorithmia-course-v1')
    const click = (label) => {
      const b = [
        ...document.querySelectorAll('.game-accessible-actions button'),
      ].find((b) => b.textContent === label)
      if (!b || b.disabled) throw Error(`missing ${label}`)
      b.click()
    }
    const nextFrame = () => new Promise(requestAnimationFrame)
    const collisions = () => {
      const app = window.__auditApp
      if (!app) throw Error('Missing Pixi hook')
      app.render()
      const texts = [],
        clipped = []
      const walk = (n, shown = true) => {
        shown =
          shown &&
          n.visible !== false &&
          n.renderable !== false &&
          (n.alpha ?? 1) > 0.05
        if (!shown) return
        if (
          typeof n.text === 'string' &&
          n.text.trim() &&
          n.style &&
          n.getBounds
        ) {
          const b = n.getBounds()
          let r = {
            x: b.minX,
            y: b.minY,
            w: b.maxX - b.minX,
            h: b.maxY - b.minY,
          }
          const raw = { ...r }
          let p = n.parent
          while (p) {
            if (p.mask?.getBounds) {
              const m = p.mask.getBounds()
              const x = Math.max(r.x, m.minX),
                y = Math.max(r.y, m.minY)
              r = {
                x,
                y,
                w: Math.min(r.x + r.w, m.maxX) - x,
                h: Math.min(r.y + r.h, m.maxY) - y,
              }
            }
            p = p.parent
          }
          if (r.w * r.h < raw.w * raw.h * 0.9)
            clipped.push({ text: n.text, raw, visible: r })
          if (r.w > 1 && r.h > 1) texts.push({ text: n.text, ...r })
        }
        for (const c of n.children ?? []) walk(c, shown)
      }
      walk(app.stage)
      const hits = []
      for (let i = 0; i < texts.length; i++)
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i],
            b = texts[j],
            w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
            h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
          if (w > 2 && h > 2 && w * h > Math.min(a.w * a.h, b.w * b.h) * 0.1)
            hits.push({
              a: a.text,
              b: b.text,
              area: Math.round(w * h),
              aRect: a,
              bRect: b,
            })
        }
      return [...hits, ...clipped.map((c) => ({ clipped: c }))]
    }
    const issues = []
    let frames = 0
    for (const m of catalog) {
      click(m.chapter)
      click(m.title)
      for (
        let tries = 0;
        tries < 120 && !document.querySelector('.formula-layer .katex');
        tries++
      )
        await nextFrame()
      for (const variant of [0, 1]) {
        if (variant) click('更换输入')
        for (let guard = 0; guard < m.frames[variant] + 5; guard++) {
          const description = document.querySelector(
            '.game-accessible-description',
          ).textContent
          const progress = description.match(/\. (\d+)\/(\d+)\./)
          if (!progress) throw Error(description)
          const step = Number(progress[1]),
            count = Number(progress[2])
          await nextFrame()
          const hits = collisions()
          const math = document.querySelector('.formula-layer:not([hidden])')
          if (math)
            for (const e of math.querySelectorAll('.formula-equation'))
              if (e.scrollWidth > e.clientWidth + 2)
                hits.push({
                  mathOverflow: e.scrollWidth - e.clientWidth,
                  text: e.textContent.slice(0, 160),
                })
          if (hits.length)
            issues.push({
              id: m.id,
              variant,
              step,
              hits: hits.slice(0, 12),
              count: hits.length,
            })
          frames++
          const next = [
            ...document.querySelectorAll('.game-accessible-actions button'),
          ].find((b) => b.textContent === '下一步 [→]')
          if (next.disabled) {
            const saved = JSON.parse(
              localStorage.getItem('algorithmia-course-v1') || '{}',
            )[m.id]?.attempts?.[variant]
            if (
              step === count &&
              saved?.completedAt &&
              (!m.transferAnswer || saved.transferred)
            )
              break
            click(
              step === count && m.transferAnswer ? m.transferAnswer : m.answer,
            )
            click('理解并继续')
          } else click('下一步 [→]')
        }
      }
      click('返回课程航线')
    }
    if (issues.length)
      throw Error(JSON.stringify({ frames, issues: issues.slice(0, 12) }))
    return { frames, issues }
  }, catalog)
}
