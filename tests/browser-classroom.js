async (page, catalog, units, sources, { url = 'http://127.0.0.1:4173/', width = 1440 } = {}) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.addInitScript(() => {
    const previous = window.__PIXI_APP_INIT__
    window.__PIXI_APP_INIT__ = app => { previous?.(app); window.__classroomApp = app }
  })
  await page.setViewportSize({ width, height: 1100 })
  await page.goto(url)
  await page.getByRole('button', { name: '课程航线', exact: true }).click()
  await page.locator('.game-accessible-actions button').first().waitFor({ state: 'attached' })
  const click = label => page.evaluate(label => {
    const button = [...document.querySelectorAll('.game-accessible-actions button')].find(button => button.textContent === label)
    if (!button || button.disabled) throw Error(`Missing ${label}`)
    button.click()
  }, label)
  const audit = () => page.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    const app = window.__classroomApp
    const hits = window.__auditText(app)
    if (hits.length) throw Error(JSON.stringify(hits.slice(0, 8)))
    const text = []
    const visit = node => {
      if (typeof node.text === 'string') text.push(node.text)
      for (const child of node.children ?? []) visit(child)
    }
    visit(app.stage)
    return text
  })
  // Use a real pointer for the primary entry, then exercise every chapter and page.
  const point = await page.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    const labels = []
    const visit = node => {
      if (node.text === '课堂主线') labels.push(node)
      for (const child of node.children ?? []) visit(child)
    }
    visit(window.__classroomApp.stage)
    if (labels.length !== 1) throw Error('Classroom primary entry is ambiguous')
    const box = labels[0].getBounds(), canvas = document.querySelector('canvas').getBoundingClientRect()
    return { x: canvas.left + (box.minX + box.maxX) / 2, y: canvas.top + (box.minY + box.maxY) / 2 }
  })
  await page.mouse.click(point.x, point.y)
  await page.waitForTimeout(50)
  if (!await page.locator('.game-accessible-description').textContent().then(text => text.includes('来源：本地文件'))) throw Error('Primary pointer entry failed')
  let pages = 0, citations = 0
  for (const unit of units) {
    await click(unit.title)
    const source = sources.find(source => source.id === unit.sourceId)
    const pageCount = Math.ceil(unit.missions.length / 6)
    for (let index = 0; index < pageCount; index++) {
      if (index) await click('下一组')
      const text = await audit()
      if (!text.includes(unit.title) || !text.some(text => text.includes(source.file))) throw Error(`${unit.id}: missing source/title`)
      for (const ref of unit.missions.slice(index * 6, index * 6 + 6)) {
        const mission = catalog.find(mission => mission.id === ref.id)
        if (!text.includes(mission.title)) throw Error(`${unit.id}: missing visible ${ref.id}`)
      }
      pages++
    }
    const mission = catalog.find(mission => mission.id === unit.missions[0].id)
    await click(mission.title)
    const description = await page.locator('.game-accessible-description').textContent()
    if (!description.includes(source.file) || !description.includes('课堂来源')) throw Error(`${unit.id}: missing in-task citation`)
    citations++
    await click('返回课堂主线')
    const text = await audit()
    if (!text.includes(unit.title)) throw Error(`${unit.id}: lost return context`)
  }
  await click(units.find(unit => unit.id === 'c05').title)
  await page.screenshot({ path: `/tmp/sector-ppt-work/screenshots/classroom-${width}.png`, fullPage: true })
  // The same private-source tasks remain attributed when reached through the knowledge map.
  await click('星域总览')
  const sample = catalog.find(mission => mission.id === 'ppt-select-bfprt')
  await click(sample.chapter)
  await click('探索课程航线')
  await click(sample.title)
  if (!(await page.locator('.game-accessible-description').textContent()).includes('第 5章-PPT-N2.pptx')) throw Error('Knowledge-map entry lost classroom provenance')
  await click('返回课程航线')
  await page.waitForTimeout(350)
  if (errors.length) throw Error(errors.join('; '))
  return { units: units.length, pages, citations, realPointerEntry: true, returnContext: true, width, errors }
}
