async (
  page,
  catalog,
  { url = 'http://127.0.0.1:4173/', width = 1280 } = {},
) => {
  await page.addInitScript(() => {
    const previousHook = window.__PIXI_APP_INIT__
    window.__PIXI_APP_INIT__ = (app) => {
      previousHook?.(app)
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
    const collisions = () => window.__auditText(window.__auditApp)
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
      throw Error(JSON.stringify({
        frames,
        issueCount: issues.length,
        missionIds: [...new Set(issues.map(issue => issue.id))],
        issues: issues.slice(0, 12),
      }))
    return { frames, issues }
  }, catalog)
}
