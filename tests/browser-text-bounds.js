(app) => {
      if (!app) throw Error('Missing Pixi hook')
      app.render()
      const texts = [],
        clipped = []
      const maskBounds = new Map()
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
            if (p.mask?.getLocalBounds && p.mask?.toGlobal) {
              // Pixi excludes a Graphics used as a mask from getBounds(); its
              // local geometry still has the actual clipping rectangle.
              let m = maskBounds.get(p.mask)
              if (!m) {
                const local = p.mask.getLocalBounds()
                const points = [[local.minX, local.minY], [local.maxX, local.minY], [local.minX, local.maxY], [local.maxX, local.maxY]].map(([x, y]) => p.mask.toGlobal({ x, y }))
                m = { minX: Math.min(...points.map(q => q.x)), minY: Math.min(...points.map(q => q.y)), maxX: Math.max(...points.map(q => q.x)), maxY: Math.max(...points.map(q => q.y)) }
                maskBounds.set(p.mask, m)
              }
              const x = Math.max(r.x, m.minX),
                y = Math.max(r.y, m.minY)
              r = {
                x,
                y,
                w: Math.max(0, Math.min(r.x + r.w, m.maxX) - x),
                h: Math.max(0, Math.min(r.y + r.h, m.maxY) - y),
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
