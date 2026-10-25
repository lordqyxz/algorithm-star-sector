async (page, { url = 'http://127.0.0.1:4173/', width = 1280 } = {}) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.addInitScript(() => {
    const previous = window.__PIXI_APP_INIT__
    window.__PIXI_APP_INIT__ = app => { previous?.(app); window.__experimentApp = app }
  })
  await page.setViewportSize({ width, height: 1100 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(url)
  await page.evaluate(() => localStorage.removeItem('algorithmia-experiments-v1'))
  await page.reload()
  const buttons = page.locator('.game-accessible-actions button')
  await buttons.first().waitFor({ state: 'attached' })
  const click = async label => {
    await page.waitForFunction(label => [...document.querySelectorAll('.game-accessible-actions button')].some(button => button.textContent === label && !button.disabled), label)
    return page.evaluate(label => {
    const button = [...document.querySelectorAll('.game-accessible-actions button')].find(button => button.textContent === label)
    if (!button || button.disabled) throw Error(`Unavailable ${label}`)
    button.click()
    }, label)
  }
  const state = () => page.locator('canvas[data-experiment]').evaluate(canvas => JSON.parse(canvas.dataset.experiment))
  const audit = () => page.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    const hits = window.__auditText(window.__experimentApp)
    if (hits.length) throw Error(JSON.stringify(hits.slice(0, 8)))
    for (const equation of document.querySelectorAll('.formula-layer:not([hidden]) .formula-equation'))
      if (equation.scrollWidth > equation.clientWidth + 2) throw Error(`Math overflow ${equation.textContent}`)
  })
  const choose = async label => {
    for (let n = 0; n < 25; n++) {
      if (await buttons.filter({ hasText: label }).count()) { await click(label); return }
      await click('下一组动作')
    }
    throw Error(`Unavailable paged choice ${label}`)
  }
  const pointer = async (target, selected) => {
    const before = await state()
    const point = await page.evaluate(async target => {
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame)
      window.__experimentApp.render()
      const hits = []
      const visit = (node, visible) => {
        visible = visible && node.visible !== false && node.renderable !== false
        if (!visible) return
        if (node.label === target && node.eventMode === 'static') {
          const b = node.getBounds(); hits.push({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 })
        }
        for (const child of node.children ?? []) visit(child, visible)
      }
      visit(window.__experimentApp.stage, true)
      if (hits.length !== 1) throw Error(`Expected one visible target ${target}, got ${hits.length}`)
      const rect = document.querySelector('canvas').getBoundingClientRect()
      return { x: hits[0].x + rect.left, y: hits[0].y + rect.top }
    }, target)
    await page.mouse.click(point.x, point.y)
    const after = await state()
    if (after.preview !== selected || after.steps !== before.steps || after.attempts !== before.attempts) throw Error(`Pointer ${target}: ${JSON.stringify(after)}`)
    await audit()
  }
  const execute = async () => { await click('执行所选动作'); await audit() }
  const shot = name => page.screenshot({ path: `/tmp/sector-round2/screenshots/pointer-${name}-${width}.png`, fullPage: true })
  await page.getByRole('button', { name: '课程航线', exact: true }).click(); await click('自由实验室')
  await page.locator('.formula-layer .katex').first().waitFor()
  await pointer('node:s', 'settle:s')
  if (!(await page.locator('.formula-layer').innerText()).includes('预计状态读数')) throw Error('Preview mathematics lacks anticipated-state caption')
  await shot('preview'); await execute()
  await pointer('node:s', 'expand:s'); await execute()
  const original = await state()
  await click('固定 A 对照')
  await page.keyboard.press('ArrowLeft')
  if ((await state()).steps !== original.steps - 1 || (await state()).total !== original.total) throw Error('Keyboard undo lost future')
  await page.keyboard.press('ArrowRight')
  if ((await state()).steps !== original.steps) throw Error('Keyboard redo failed')
  await page.keyboard.press('ArrowLeft')
  await pointer('edge-label:s:a', 'relax:sa'); await execute()
  const fork = await state()
  if (!fork.comparison || fork.activeId === fork.comparisonId || fork.total !== 2) throw Error('Executing after undo did not preserve a separate future')
  await click('将 A 设为当前')
  if ((await state()).steps !== original.steps) throw Error('Comparison swap did not restore future')
  await click('调整输入')
  const form = page.locator('.experiment-input-form')
  const input = form.locator('input').first(), oldValue = Number(await input.inputValue())
  await input.fill(String(oldValue === 9 ? 8 : oldValue + 1))
  if ((await state()).steps !== original.steps) throw Error('Draft changed state')
  await form.getByRole('button', { name: '应用并新建分支', exact: true }).click()
  if ((await state()).steps !== 0 || !(await state()).comparison) throw Error('Input did not create a fresh comparable branch')
  await shot('branches')
  await click('0/1 背包 · 依赖与方案')
  await pointer('cell:2:5', 'select-2-5'); await execute()
  await pointer('cell:1:5', 'connect-skip'); await execute()
  await pointer('cell:1:2', 'connect-take'); await execute()
  await pointer('item:item1', 'toggle-item1'); await execute()
  await shot('dependencies')
  await click('最大流 · 残量与增广')
  for (const [target, id] of [['edge-label:s:a', 'sa'], ['edge:a:b', 'ab'], ['edge:b:t', 'bt']]) { await pointer(target, `extend:${id}`); await execute() }
  await choose('提交路径与自选整数增广量'); await execute()
  for (const [target, id] of [['edge:s:b', 'sb'], ['edge:b:a', 'rev:ab'], ['edge:a:t', 'at']]) { await pointer(target, `extend:${id}`); await execute() }
  await choose('提交路径与自选整数增广量'); await execute()
  const texts = () => page.evaluate(() => {
    const out = []; const visit = (node, visible) => { visible = visible && node.visible !== false; if (!visible) return; if (typeof node.text === 'string') out.push(node.text); for (const child of node.children ?? []) visit(child, visible) }; visit(window.__experimentApp.stage, true); return out
  })
  if (!(await texts()).some(text => text.includes('−2'))) throw Error('Zeroed reverse residual lost actual withdrawal label')
  await shot('reverse')
  await choose('检查残量可达集与割容量'); await execute()
  const cutTexts = await texts()
  if (!cutTexts.some(text => text.includes('∈S')) || !cutTexts.some(text => text.includes('∈T'))) throw Error('Cut partition not visible')
  await shot('cut')
  await click('顶点覆盖 → 审稿委员会')
  await pointer('edge:v:a:v:b', 'choose:ab'); await execute()
  await choose('为边 ab 新建议题'); await execute()
  await pointer('node:p:b', 'member:ab:b'); await execute()
  await pointer('node:v:b', 'witness:b'); await execute()
  await shot('reduction')
  await choose('检查构造与全部小例集合'); await execute()
  await click('展开依据'); await audit(); await shot('evidence')
  const evidence = await texts()
  if (!evidence.some(text => text.includes('尚无对应议题')) || evidence.some(text => /missing:|members:/.test(text))) throw Error('Construction problems were not explained to the learner')
  for (const label of ['查看正向论证', '查看反向论证', '查看构造规模与 NP 成员性']) { await choose(label); await execute() }
  await shot('argument')
  await click('调整输入'); await form.locator('input').first().focus(); await page.keyboard.press('Escape')
  if (await form.isVisible()) throw Error('Escape did not dismiss input form')
  await page.locator('canvas').focus(); await page.keyboard.press('r')
  if ((await state()).steps !== 0 || (await state()).total === 0) throw Error('Restart destroyed recorded future')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await pointer('edge:v:a:v:b', 'choose:ab'); await execute()
  await page.keyboard.press('Escape')
  if (await page.locator('canvas[data-experiment]').count()) throw Error('Scene did not close')
  if (await page.locator('.experiment-input-form,.experiment-amount-control').count()) throw Error('Native controls leaked after scene destroy')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(350)
  if (errors.length) throw Error(errors.join('; '))
  return { width, nodeAndEdge: true, dependencies: true, items: true, reverseResidual: true, cut: true, reductionMapping: true, branches: true, inputDraft: true, keyboard: true, reducedMotion: true, cleanup: true, errors }
}
