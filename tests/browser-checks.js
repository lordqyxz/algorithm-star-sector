async (page, catalog, viewport = { width: 1440, height: 1000 }) => {
  const failures = []
  await page.goto('http://127.0.0.1:4173/')
  page.on('pageerror', error => failures.push(error.message))
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()) })
  await page.setViewportSize(viewport)
  await page.getByRole('button', { name: '课程航线', exact: true }).click()
  await page.locator('.game-accessible-actions button').first().waitFor({ state: 'attached' })
  const result = await page.evaluate(async catalog => {
    window.localStorage.removeItem('algorithmia-course-v1')
    const click = label => {
      const buttons = [...document.querySelectorAll('.game-accessible-actions button')]
      const button = buttons.find(node => node.textContent === label)
      if (!button || button.disabled) throw new Error(`Unavailable action ${label}; got ${buttons.map(node => node.textContent).join('|')}`)
      button.click()
    }
    let totalSteps = 0, checkpoints = 0
    for (const mission of catalog) {
      click(mission.chapter)
      click(mission.title)
      for (let wait = 0; wait < 120 && !document.querySelector('.formula-layer .katex'); wait++) await new Promise(requestAnimationFrame)
      if (!document.querySelector('.formula-layer .katex-mathml math')) throw new Error(`${mission.id}: missing typeset MathML`)
      for (const variant of [0, 1]) {
        if (variant) click('更换输入')
        let guard = 0
        while (guard++ < mission.frames[variant] + 10) {
          const bounds = JSON.parse(document.querySelector('.game-host canvas').dataset.layoutBounds)
          if (bounds.controlsTop < bounds.evidenceBottom + 10 || bounds.controlsTop < bounds.sidebarBottom + 10) throw new Error(`${mission.id}: text/control overlap`)
          const math = document.querySelector('.formula-layer:not([hidden])')
          if (math && math.querySelector('.katex-error')) throw new Error(`${mission.id}: unrendered LaTeX`)
          if (math && [...math.querySelectorAll('.formula-equation')].some(equation => equation.scrollWidth > equation.clientWidth + 2)) throw new Error(`${mission.id}: formula requires horizontal scrolling`)
          const text = document.querySelector('.game-accessible-description').textContent
          const progress = text.match(/\. (\d+)\/(\d+)\./)
          if (!progress) throw new Error(`${mission.id}: missing progress ${text.slice(0,100)}`)
          const step = Number(progress[1]), count = Number(progress[2])
          if (count !== mission.frames[variant]) throw new Error(`${mission.id}: wrong trace length`)
          const next = [...document.querySelectorAll('.game-accessible-actions button')].find(node => node.textContent === '下一步 [→]')
          const existing = JSON.parse(window.localStorage.getItem('algorithmia-course-v1') || '{}')[mission.id]?.attempts?.[variant]
          if (step === count && next.disabled && existing?.completedAt && (!mission.transferAnswer || existing.transferred)) break
          if (next.disabled) {
            click(step === count && mission.transferAnswer ? mission.wrongTransfer : mission.wrongAnswer)
            const guard = [...document.querySelectorAll('.game-accessible-actions button')].find(node => node.textContent === '下一步 [→]')
            if (!guard.disabled) throw new Error(`${mission.id}: incorrect response advanced the mission`)
            click(step === count && mission.transferAnswer ? mission.transferAnswer : mission.answer)
            click('理解并继续')
            checkpoints++
          } else { click('下一步 [→]'); totalSteps++ }
        }
        const saved = JSON.parse(window.localStorage.getItem('algorithmia-course-v1'))[mission.id].attempts[variant]
        if (!saved.completedAt || !saved.checked || saved.step !== mission.frames[variant] - 1) throw new Error(`${mission.id}: not saved as complete`)
        click('上一步 [←]')
        click('下一步 [→]')
      }
      click('返回课程航线')
    }
    if (document.documentElement.scrollWidth > innerWidth) throw new Error('horizontal page overflow')
    return { missions: catalog.length, inputPaths: catalog.length * 2, totalSteps, checkpoints, viewport: innerWidth }
  }, catalog)
  await page.waitForTimeout(400)
  if (failures.length) throw new Error(`Browser errors: ${failures.join('; ')}`)
  return result
}
