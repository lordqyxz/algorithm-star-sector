import type { CourseMission, TraceEdge, TraceFrame, TraceNode } from '../types'
import { record } from './trace'

type FrameDraft = Omit<TraceFrame, 'counters'> & {
  counters?: Record<string, number | string>
}
type TNode = {
  id: string
  value: number
  left: TNode | null
  right: TNode | null
  parent: TNode | null
  height?: number
  color?: 'red' | 'black'
}
const sourcesFor = (id: string): CourseMission['sources'] => {
  if (id === 'tree-huffman')
    return ['combined', 'structures', 'design', 'advanced']
  if (id === 'tree-red-black') return ['combined']
  if (id === 'tree-optimal-search') return ['structures']
  if (
    [
      'tree-properties',
      'tree-traversals',
      'tree-bst',
      'tree-avl',
      'tree-btree',
      'tree-heap',
    ].includes(id)
  )
    return ['combined', 'structures']
  return ['structures']
}
const mission = (id: string, trace: CourseMission['trace']): CourseMission => ({
  id,
  chapter: 'trees',
  sources: sourcesFor(id),
  trace,
})
function recordAll(drafts: FrameDraft[]): TraceFrame[] {
  const frames: TraceFrame[] = []
  for (const draft of drafts)
    record(frames, { ...draft, counters: draft.counters ?? {} })
  return frames
}
function layout(root: TNode | null): {
  nodes: TraceNode[]
  edges: TraceEdge[]
} {
  const nodes: TraceNode[] = [],
    edges: TraceEdge[] = []
  const visit = (
    node: TNode | null,
    x: number,
    y: number,
    span: number,
  ): void => {
    if (!node) return
    nodes.push({
      id: node.id,
      value: node.value,
      x: Math.max(0.03, Math.min(0.97, x)),
      y: Math.max(0.08, Math.min(0.92, y)),
      ...(node.color ? { tone: node.color } : {}),
    })
    if (node.left) {
      edges.push({ from: node.id, to: node.left.id, weight: 'left' })
      visit(node.left, x - span, y + 0.2, span / 2)
    }
    if (node.right) {
      edges.push({ from: node.id, to: node.right.id, weight: 'right' })
      visit(node.right, x + span, y + 0.2, span / 2)
    }
  }
  visit(root, 0.5, 0.14, 0.23)
  return { nodes, edges }
}
function bstInsert(
  root: TNode | null,
  value: number,
): { root: TNode; inserted: TNode; comparisons: number } {
  const node: TNode = {
    id: `n${value}`,
    value,
    left: null,
    right: null,
    parent: null,
  }
  if (!root) return { root: node, inserted: node, comparisons: 0 }
  let at = root,
    comparisons = 0
  while (true) {
    comparisons++
    if (value < at.value) {
      if (!at.left) {
        at.left = node
        node.parent = at
        break
      }
      at = at.left
    } else {
      if (!at.right) {
        at.right = node
        node.parent = at
        break
      }
      at = at.right
    }
  }
  return { root, inserted: node, comparisons }
}
function bstFind(
  root: TNode | null,
  value: number,
): { found: TNode | null; path: TNode[] } {
  const path: TNode[] = []
  let at = root
  while (at) {
    path.push(at)
    if (at.value === value) return { found: at, path }
    at = value < at.value ? at.left : at.right
  }
  return { found: null, path }
}
function bstRemove(
  root: TNode | null,
  value: number,
): { root: TNode | null; removed: boolean; successor?: number } {
  const found = bstFind(root, value).found
  if (!found) return { root, removed: false }
  let successor: number | undefined
  const transplant = (old: TNode, replacement: TNode | null): void => {
    if (!old.parent) root = replacement
    else if (old.parent.left === old) old.parent.left = replacement
    else old.parent.right = replacement
    if (replacement) replacement.parent = old.parent
  }
  if (!found.left) transplant(found, found.right)
  else if (!found.right) transplant(found, found.left)
  else {
    let next = found.right
    while (next.left) next = next.left
    successor = next.value
    if (next.parent !== found) {
      transplant(next, next.right)
      next.right = found.right
      next.right.parent = next
    }
    transplant(found, next)
    next.left = found.left
    next.left.parent = next
  }
  return { root, removed: true, successor }
}
function inorder(root: TNode | null): TNode[] {
  return root ? [...inorder(root.left), root, ...inorder(root.right)] : []
}
function makeTree(values: number[]): TNode | null {
  let root: TNode | null = null
  for (const value of values) root = bstInsert(root, value).root
  return root
}
const treeValues = (v: 0 | 1): number[] =>
  v ? [8, 4, 12, 2, 6, 10, 14] : [7, 3, 11, 1, 5, 9, 13]
const treeFrames = (
  root: TNode | null,
  formula: string,
  op: TraceFrame['op'],
  counters: Record<string, number | string>,
  output?: TraceFrame['output'],
): FrameDraft => ({
  op,
  formula,
  ...layout(root),
  counters,
  ...(output ? { output } : {}),
})

export const treesMissions: CourseMission[] = [
  mission('tree-properties', (v) => {
    const values = treeValues(v),
      root = makeTree(values),
      h = 2,
      capacity = 2 ** (h + 1) - 1
    const frames = [
      treeFrames(root, 'perfect capacity = 2^(h+1) - 1', 'start', {
        height: h,
        nodes: values.length,
        leaves: inorder(root).filter((n) => !n.left && !n.right).length,
        capacity,
      }),
      treeFrames(root, 'array child(i) = 2i+1 / 2i+2', 'compare', {
        nodes: values.length,
        arraySlots: capacity,
      }),
      treeFrames(
        root,
        'linked representation stores left and right references',
        'update',
        { nodes: values.length, links: values.length - 1 },
      ),
      treeFrames(
        root,
        'complete tree fills each level from left to right',
        'done',
        { height: h, nodes: values.length, capacity },
      ),
    ]
    return recordAll(frames)
  }),
  mission('tree-traversals', (v) => {
    const values = treeValues(v),
      root = makeTree(values),
      pre: TNode[] = [],
      post: TNode[] = [],
      level: TNode[] = []
    const walk = (n: TNode | null): void => {
      if (!n) return
      pre.push(n)
      walk(n.left)
      walk(n.right)
      post.push(n)
    }
    walk(root)
    if (root) {
      const q = [root]
      while (q.length) {
        const n = q.shift()!
        level.push(n)
        if (n.left) q.push(n.left)
        if (n.right) q.push(n.right)
      }
    }
    const out = (nodes: TNode[]) =>
      nodes.map((n, i) => ({ id: `visit${i}`, value: n.value }))
    const draft = (
      order: TNode[],
      formula: string,
      op: TraceFrame['op'],
    ): FrameDraft => ({
      ...treeFrames(root, formula, op, { visited: order.length }),
      output: out(order),
    })
    const frames = [
      draft(pre, 'preorder = root, left, right', 'start'),
      draft(inorder(root), 'inorder = left, root, right', 'visit'),
      draft(post, 'postorder = left, right, root', 'visit'),
      draft(level, 'level order uses FIFO queue', 'done'),
    ]
    return recordAll(frames)
  }),
  mission('tree-threaded', (v) => {
    const root = makeTree(treeValues(v)),
      ordered = inorder(root),
      successors = new Map<string, string>()
    ordered.forEach((n, i) => {
      if (!n.right && ordered[i + 1]) successors.set(n.id, ordered[i + 1].id)
    })
    const base = layout(root),
      edges = [
        ...base.edges,
        ...[...successors].map(([from, to]) => ({
          from,
          to,
          weight: 'thread',
        })),
      ]
    const traversed: TNode[] = []
    let current = ordered[0]
    while (current) {
      traversed.push(current)
      if (current.right) {
        current = current.right
        while (current.left) current = current.left
      } else {
        const id = successors.get(current.id)
        current = id ? ordered.find((n) => n.id === id)! : (undefined as never)
      }
    }
    return recordAll([
      {
        op: 'start',
        formula: 'inorder successor = leftmost node in right subtree',
        ...base,
        counters: {
          nodes: ordered.length,
          realLinks: base.edges.length,
          threads: 0,
        },
      },
      {
        op: 'insert',
        formula: 'replace null right child link with inorder successor thread',
        nodes: base.nodes,
        edges,
        counters: { realLinks: base.edges.length, threads: successors.size },
      },
      ...traversed.map((node, i) => ({
        op: 'visit' as const,
        formula: `visit ${node.value}; follow its real right subtree or successor thread`,
        nodes: base.nodes.map((n) => ({
          ...n,
          tone: traversed.slice(0, i).some((done) => done.id === n.id)
            ? ('settled' as const)
            : n.id === node.id
              ? ('active' as const)
              : n.tone,
        })),
        edges,
        output: traversed
          .slice(0, i + 1)
          .map((n, j) => ({ id: `succ${j}`, value: n.value })),
        counters: {
          visited: i + 1,
          threadsFollowed: traversed
            .slice(0, i)
            .filter((done) => successors.has(done.id)).length,
        },
      })),
      {
        op: 'done',
        formula: 'threaded traversal visits each node once',
        nodes: base.nodes,
        edges,
        counters: { visited: traversed.length, threads: successors.size },
      },
    ])
  }),
  mission('tree-general-conversion', (v) => {
    const names = v
      ? ['A', 'B', 'C', 'D', 'E', 'F']
      : ['R', 'P', 'Q', 'S', 'T', 'U']
    const virtual = 'virtual-root'
    const children = new Map<string, string[]>([
      [names[0], [names[1], names[2]]],
      [names[1], [names[3], names[4]]],
    ])
    const positions: Record<string, [number, number]> = {
      [names[0]]: [0.5, 0.14],
      [names[1]]: [0.28, 0.42],
      [names[2]]: [0.72, 0.42],
      [names[3]]: [0.14, 0.72],
      [names[4]]: [0.42, 0.72],
      [names[5]]: [0.88, 0.14],
    }
    const nodes = [
      ...names.map((id) => ({
        id,
        value: id,
        x: positions[id][0],
        y: positions[id][1],
      })),
      { id: virtual, value: 'virtual', x: 0.5, y: 0.02 },
    ]
    const generalEdges: TraceEdge[] = [...children].flatMap(([parent, kids]) =>
      kids.map((child) => ({ from: parent, to: child })),
    )
    const binaryEdges: TraceEdge[] = []
    for (const [parent, kids] of children)
      if (kids.length) {
        binaryEdges.push({ from: parent, to: kids[0], weight: 'left-child' })
        for (let i = 1; i < kids.length; i++)
          binaryEdges.push({
            from: kids[i - 1],
            to: kids[i],
            weight: 'right-sibling',
          })
      }
    binaryEdges.push(
      { from: virtual, to: names[0], weight: 'left-child' },
      { from: names[0], to: names[5], weight: 'right-sibling' },
    )
    const edgeAt = new Map(
      binaryEdges.map((edge) => [`${edge.from}:${edge.weight}`, edge.to]),
    )
    const decoded = new Map<string, string[]>()
    for (const parent of [...children.keys(), virtual]) {
      const kids: string[] = []
      let child = edgeAt.get(`${parent}:left-child`)
      while (child) {
        kids.push(child)
        child = edgeAt.get(`${child}:right-sibling`)
      }
      if (kids.length) decoded.set(parent, kids)
    }
    const decodedEdges: TraceEdge[] = [...decoded].flatMap(([parent, kids]) =>
      kids.map((child) => ({ from: parent, to: child })),
    )
    const roots = [names[0], names[5]]
    const preorder: string[] = [],
      postorder: string[] = []
    const visitPre = (id: string): void => {
      preorder.push(id)
      for (const child of children.get(id) ?? []) visitPre(child)
    }
    const visitPost = (id: string): void => {
      for (const child of children.get(id) ?? []) visitPost(child)
      postorder.push(id)
    }
    roots.forEach(visitPre)
    roots.forEach(visitPost)
    return recordAll([
      {
        op: 'start',
        formula: 'forest roots attach beneath a virtual root',
        nodes,
        edges: [
          ...generalEdges,
          ...roots.map((id) => ({ from: virtual, to: id })),
        ],
        counters: {
          nodes: names.length,
          roots: roots.length,
          links: generalEdges.length + roots.length,
        },
      },
      {
        op: 'update',
        formula: 'first child → left; next sibling → right',
        nodes,
        edges: binaryEdges,
        counters: { nodes: names.length, binaryLinks: binaryEdges.length },
      },
      {
        op: 'update',
        formula: 'decode left child and follow right sibling chain',
        nodes,
        edges: decodedEdges,
        counters: {
          recoveredEdges: decodedEdges.length,
          rootsRecovered: decoded.get(virtual)?.length ?? 0,
        },
      },
      {
        op: 'visit',
        formula: 'forest preorder: visit each root before its ordered children',
        nodes,
        edges: [
          ...generalEdges,
          ...roots.map((id) => ({ from: virtual, to: id })),
        ],
        output: preorder.map((value, i) => ({ id: `pre${i}`, value })),
        counters: { visited: preorder.length, roots: roots.length },
      },
      {
        op: 'visit',
        formula: 'forest postorder: visit each root after its ordered children',
        nodes,
        edges: [
          ...generalEdges,
          ...roots.map((id) => ({ from: virtual, to: id })),
        ],
        output: postorder.map((value, i) => ({ id: `post${i}`, value })),
        counters: { visited: postorder.length, roots: roots.length },
      },
      {
        op: 'done',
        formula:
          'left-child/right-sibling preserves child lists and forest roots',
        nodes,
        edges: binaryEdges,
        counters: {
          nodes: names.length,
          links: binaryEdges.length,
          roots: roots.length,
        },
      },
    ])
  }),
  mission('tree-huffman', (v) => {
    const frequency = v
      ? { A: 2, B: 3, C: 7, D: 9 }
      : { A: 1, B: 2, C: 4, D: 8 }
    type H = { id: string; weight: number; left?: H; right?: H }
    const queue: H[] = Object.entries(frequency)
      .map(([id, weight]) => ({ id, weight }))
      .sort((a, b) => a.weight - b.weight)
    const all: H[] = [...queue],
      links: TraceEdge[] = [],
      frames: FrameDraft[] = []
    const hNodes = (): TraceNode[] =>
      all.map((n, i) => ({
        id: n.id,
        value: n.weight,
        x: 0.1 + (i % 4) * 0.26,
        y: n.left ? 0.45 + i * 0.035 : 0.15,
      }))
    frames.push({
      op: 'start',
      formula: 'merge two least weights repeatedly',
      nodes: hNodes(),
      counters: { queue: queue.length, merges: 0 },
    })
    let merges = 0
    while (queue.length > 1) {
      const left = queue.shift()!,
        right = queue.shift()!,
        parent: H = {
          id: `h${merges}`,
          weight: left.weight + right.weight,
          left,
          right,
        }
      merges++
      all.push(parent)
      links.push(
        { from: left.id, to: parent.id, weight: '0' },
        { from: right.id, to: parent.id, weight: '1' },
      )
      queue.push(parent)
      queue.sort((a, b) => a.weight - b.weight || a.id.localeCompare(b.id))
      frames.push({
        op: 'merge',
        formula: `parent weight = ${left.weight} + ${right.weight}`,
        nodes: hNodes(),
        edges: [...links],
        counters: { queue: queue.length, merges },
      })
    }
    const codes: [string, string][] = []
    const visit = (n: H, code: string): void => {
      if (!n.left && !n.right) codes.push([n.id, code || '0'])
      else {
        visit(n.left!, code + '0')
        visit(n.right!, code + '1')
      }
    }
    visit(queue[0], '')
    const wpl = codes.reduce(
      (s, [id, code]) =>
        s + frequency[id as keyof typeof frequency] * code.length,
      0,
    )
    const prefixFree = Number(
      codes.every(([_, code], i) =>
        codes.every(([__, other], j) => i === j || !other.startsWith(code)),
      ),
    )
    frames.push({
      op: 'done',
      formula: 'WPL = Σ frequency × code length',
      nodes: hNodes(),
      edges: links,
      output: codes.map(([id, value]) => ({
        id: `code-${id}`,
        value: `${id}:${value}`,
      })),
      counters: { wpl, merges, prefixFree },
    })
    return recordAll(frames)
  }),
  mission('tree-bst', (v) => {
    const inserted = treeValues(v),
      key = v ? 5 : 6,
      deleted = v ? 4 : 3,
      searchKey = v ? 10 : 9
    let root: TNode | null = null,
      frames: FrameDraft[] = []
    frames.push({
      op: 'start',
      formula: 'insert compares key and descends left or right',
      nodes: [],
      edges: [],
      counters: { nodes: 0 },
    })
    for (const value of [...inserted, key]) {
      const result = bstInsert(root, value)
      root = result.root
      frames.push(
        treeFrames(
          root,
          `insert ${value} at its ordered null child link`,
          value === key ? 'insert' : 'update',
          {
            inserted: value,
            comparisons: result.comparisons,
            nodes: inorder(root).length,
          },
        ),
      )
    }
    const found = bstFind(root, searchKey)
    frames.push({
      ...treeFrames(
        root,
        'search follows comparisons until key or null link',
        'select',
        {
          searchComparisons: found.path.length,
          found: Number(Boolean(found.found)),
        },
      ),
      output: found.path.map((n, i) => ({ id: `path${i}`, value: n.value })),
    })
    const result = bstRemove(root, deleted)
    root = result.root
    frames.push(
      treeFrames(
        root,
        'two-child deletion transplants inorder successor; one-child cases transplant child',
        'remove',
        {
          deleted,
          successor: result.successor ?? 'none',
          nodes: inorder(root).length,
        },
      ),
    )
    frames.push({
      ...treeFrames(
        root,
        'inorder traversal verifies search-tree ordering after deletion',
        'done',
        { nodes: inorder(root).length, removed: Number(result.removed) },
      ),
      output: inorder(root).map((n, i) => ({
        id: `sorted${i}`,
        value: n.value,
      })),
    })
    return recordAll(frames)
  }),
  mission('tree-avl', (v) => {
    const sequence = v ? [30, 20, 10, 25, 28] : [30, 10, 20, 5, 4]
    let root: TNode | null = null,
      frames: FrameDraft[] = []
    const height = (n: TNode | null): number => (n ? (n.height ?? 1) : 0)
    const update = (n: TNode): void => {
      n.height = 1 + Math.max(height(n.left), height(n.right))
    }
    const balance = (n: TNode): number => height(n.left) - height(n.right)
    const rotateRight = (y: TNode): TNode => {
      const x = y.left!,
        parent = y.parent
      const beta = x.right
      x.parent = parent
      if (!parent) root = x
      else if (parent.left === y) parent.left = x
      else parent.right = x
      x.right = y
      y.parent = x
      y.left = beta
      if (beta) beta.parent = y
      update(y)
      update(x)
      return x
    }
    const rotateLeft = (x: TNode): TNode => {
      const y = x.right!,
        parent = x.parent
      const beta = y.left
      y.parent = parent
      if (!parent) root = y
      else if (parent.left === x) parent.left = y
      else parent.right = y
      y.left = x
      x.parent = y
      x.right = beta
      if (beta) beta.parent = x
      update(x)
      update(y)
      return y
    }
    const insert = (value: number): number => {
      if (!root) {
        root = {
          id: `n${value}`,
          value,
          left: null,
          right: null,
          parent: null,
          height: 1,
        }
        return 0
      }
      let parent = root
      while (true) {
        if (value < parent.value) {
          if (parent.left) parent = parent.left
          else {
            parent.left = {
              id: `n${value}`,
              value,
              left: null,
              right: null,
              parent,
              height: 1,
            }
            break
          }
        } else {
          if (parent.right) parent = parent.right
          else {
            parent.right = {
              id: `n${value}`,
              value,
              left: null,
              right: null,
              parent,
              height: 1,
            }
            break
          }
        }
      }
      let rotations = 0,
        current: TNode | null = parent
      while (current) {
        update(current)
        const bf = balance(current)
        let subtree: TNode = current
        if (bf > 1) {
          if (balance(current.left!) < 0) {
            current.left = rotateLeft(current.left!)
            rotations++
          }
          subtree = rotateRight(current)
          rotations++
        } else if (bf < -1) {
          if (balance(current.right!) > 0) {
            current.right = rotateRight(current.right!)
            rotations++
          }
          subtree = rotateLeft(current)
          rotations++
        }
        const up: TNode | null = subtree.parent
        if (!up) root = subtree
        else if (up.left === current || up.left === subtree) up.left = subtree
        else up.right = subtree
        subtree.parent = up
        current = up
      }
      return rotations
    }
    const stats = (): { maxBalance: number; height: number } => {
      let maxBalance = 0
      const walk = (n: TNode | null): number => {
        if (!n) return 0
        const l = walk(n.left),
          r = walk(n.right)
        maxBalance = Math.max(maxBalance, Math.abs(l - r))
        return 1 + Math.max(l, r)
      }
      return { maxBalance, height: walk(root) }
    }
    for (const value of sequence) {
      const rotations = insert(value),
        s = stats()
      frames.push(
        treeFrames(
          root,
          `insert ${value}; update heights and rotate at every unbalanced ancestor`,
          frames.length ? 'insert' : 'start',
          {
            inserted: value,
            rotations,
            height: s.height,
            maxAbsBalance: s.maxBalance,
          },
        ),
      )
    }
    const s = stats()
    frames.push(
      treeFrames(
        root,
        'AVL invariant: every node has |height(left)-height(right)| ≤ 1',
        'done',
        {
          nodes: inorder(root).length,
          height: s.height,
          maxAbsBalance: s.maxBalance,
        },
      ),
    )
    return recordAll(frames)
  }),
  mission('tree-btree', (v) => {
    const values = v
      ? [10, 20, 5, 6, 12, 30, 7, 17]
      : [8, 16, 3, 4, 9, 20, 2, 5]
    type B = { id: string; keys: number[]; children: B[]; leaf: boolean }
    let serial = 0,
      root: B = { id: `b${serial++}`, keys: [], children: [], leaf: true },
      splits = 0
    const frames: FrameDraft[] = []
    const snapshot = (
      op: TraceFrame['op'],
      formula: string,
      extra: Record<string, number | string> = {},
    ): FrameDraft => {
      const nodes: TraceNode[] = [],
        edges: TraceEdge[] = []
      const walk = (n: B, x: number, y: number, span: number): void => {
        nodes.push({ id: n.id, value: n.keys.join(' | '), x, y })
        n.children.forEach((c, i) => {
          edges.push({ from: n.id, to: c.id })
          walk(
            c,
            x + (i - (n.children.length - 1) / 2) * span,
            y + 0.25,
            span / Math.max(1, n.children.length),
          )
        })
      }
      walk(root, 0.5, 0.15, 0.45)
      return {
        op,
        formula,
        nodes,
        edges,
        counters: {
          t: 2,
          splits,
          keys: nodes.reduce(
            (s, n) => s + String(n.value).split(' | ').filter(Boolean).length,
            0,
          ),
          ...extra,
        },
      }
    }
    const splitChild = (parent: B, i: number): void => {
      const y = parent.children[i],
        z: B = {
          id: `b${serial++}`,
          keys: [y.keys[2]],
          children: y.leaf ? [] : y.children.splice(2, 2),
          leaf: y.leaf,
        }
      const promoted = y.keys[1]
      y.keys = [y.keys[0]]
      parent.keys.splice(i, 0, promoted)
      parent.children.splice(i + 1, 0, z)
      splits++
    }
    const insertNonFull = (node: B, value: number): void => {
      let i = node.keys.length - 1
      if (node.leaf) {
        node.keys.push(value)
        node.keys.sort((a, b) => a - b)
        return
      }
      while (i >= 0 && value < node.keys[i]) i--
      i++
      if (node.children[i].keys.length === 3) {
        splitChild(node, i)
        if (value > node.keys[i]) i++
      }
      insertNonFull(node.children[i], value)
    }
    frames.push(
      snapshot('start', 'minimum degree t=2: nodes hold up to 2t−1 = 3 keys'),
    )
    for (const value of values) {
      if (root.keys.length === 3) {
        const next: B = {
          id: `b${serial++}`,
          keys: [],
          children: [root],
          leaf: false,
        }
        splitChild(next, 0)
        root = next
      }
      insertNonFull(root, value)
      frames.push(
        snapshot('insert', `insert ${value}, splitting full nodes on descent`, {
          inserted: value,
        }),
      )
    }
    const search = (
      n: B,
      key: number,
      count = 0,
    ): { found: boolean; comparisons: number } => {
      let i = 0
      while (i < n.keys.length && key > n.keys[i]) {
        i++
        count++
      }
      if (i < n.keys.length) {
        count++
        if (key === n.keys[i]) return { found: true, comparisons: count }
      }
      return n.leaf
        ? { found: false, comparisons: count }
        : search(n.children[i], key, count)
    }
    const found = search(root, values[4])
    frames.push(
      snapshot(
        'select',
        'search compares separator keys and descends into the bounded interval',
        {
          searchComparisons: found.comparisons,
          found: Number(found.found),
          searchKey: values[4],
        },
      ),
    )
    const leafDepths: number[] = []
    const check = (n: B, d: number): void => {
      if (n.leaf) leafDepths.push(d)
      else n.children.forEach((c) => check(c, d + 1))
    }
    check(root, 0)
    frames.push(
      snapshot('done', 'keys sorted per node; all leaves share depth', {
        minLeafDepth: Math.min(...leafDepths),
        maxLeafDepth: Math.max(...leafDepths),
        valid: Number(new Set(leafDepths).size === 1),
      }),
    )
    return recordAll(frames)
  }),
  mission('tree-23', (v) => {
    const values = v
      ? [40, 20, 60, 10, 30, 50, 70]
      : [20, 10, 30, 5, 15, 25, 35]
    type N23 = { id: string; keys: number[]; children: N23[] }
    type Split = { promoted: number; left: N23; right: N23 }
    let serial = 0,
      root: N23 = { id: `23-${serial++}`, keys: [], children: [] },
      splits = 0
    const frames: FrameDraft[] = []
    const snapshot = (
      op: TraceFrame['op'],
      formula: string,
      extra: Record<string, number | string> = {},
    ): FrameDraft => {
      const nodes: TraceNode[] = [],
        edges: TraceEdge[] = []
      const walk = (node: N23, x: number, y: number, span: number): void => {
        nodes.push({ id: node.id, value: node.keys.join(' | '), x, y })
        node.children.forEach((child, i) => {
          edges.push({ from: node.id, to: child.id })
          walk(
            child,
            x + (i - (node.children.length - 1) / 2) * span,
            y + 0.25,
            span / Math.max(1, node.children.length),
          )
        })
      }
      walk(root, 0.5, 0.14, 0.42)
      const keys = nodes.reduce(
        (sum, node) =>
          sum + String(node.value).split(' | ').filter(Boolean).length,
        0,
      )
      return {
        op,
        formula,
        nodes,
        edges,
        counters: { keys, splits, maxKeysPerNode: 2, ...extra },
      }
    }
    const insert = (node: N23, key: number): Split | null => {
      if (node.children.length === 0) node.keys.push(key)
      else {
        let index = 0
        while (index < node.keys.length && key > node.keys[index]) index++
        const split = insert(node.children[index], key)
        if (split) {
          node.keys.splice(index, 0, split.promoted)
          node.children.splice(index, 1, split.left, split.right)
        }
      }
      node.keys.sort((a, b) => a - b)
      if (node.keys.length <= 2) return null
      const [low, middle, high] = node.keys
      const left: N23 = {
        id: node.id,
        keys: [low],
        children: node.children.length ? node.children.slice(0, 2) : [],
      }
      const right: N23 = {
        id: `23-${serial++}`,
        keys: [high],
        children: node.children.length ? node.children.slice(2) : [],
      }
      splits++
      return { promoted: middle, left, right }
    }
    frames.push(
      snapshot(
        'start',
        '2–3 tree nodes hold one or two keys; an overflow promotes the middle key',
      ),
    )
    for (const key of values) {
      const split = insert(root, key)
      if (split)
        root = {
          id: `23-${serial++}`,
          keys: [split.promoted],
          children: [split.left, split.right],
        }
      frames.push(
        snapshot(
          'insert',
          `insert ${key}; split a three-key overflow and promote its middle`,
          { inserted: key },
        ),
      )
    }
    const depths: number[] = []
    const checkDepth = (node: N23, depth: number): void => {
      if (!node.children.length) depths.push(depth)
      else node.children.forEach((child) => checkDepth(child, depth + 1))
    }
    checkDepth(root, 0)
    const searchKey = values[4]
    let at: N23 | undefined = root,
      comparisons = 0,
      found = false
    while (at) {
      let index = 0
      while (index < at.keys.length && searchKey > at.keys[index]) {
        comparisons++
        index++
      }
      if (index < at.keys.length) {
        comparisons++
        if (at.keys[index] === searchKey) {
          found = true
          break
        }
      }
      at = at.children[index]
    }
    frames.push(
      snapshot(
        'select',
        'search checks at most two keys, then chooses one of up to three children',
        { searchKey, comparisons, found: Number(found) },
      ),
    )
    frames.push(
      snapshot(
        'done',
        '2–3 invariant: one or two ordered keys per node and equal leaf depth',
        {
          minLeafDepth: Math.min(...depths),
          maxLeafDepth: Math.max(...depths),
          valid: Number(new Set(depths).size === 1),
        },
      ),
    )
    return recordAll(frames)
  }),
  mission('tree-red-black', (v) => {
    const sequence = v
      ? [11, 2, 14, 1, 7, 15, 5, 8]
      : [10, 5, 15, 1, 7, 12, 18, 6]
    let root: TNode | null = null,
      rotations = 0
    const frames: FrameDraft[] = []
    const rotateLeft = (x: TNode): void => {
      const y = x.right!
      rotations++
      x.right = y.left
      if (y.left) y.left.parent = x
      y.parent = x.parent
      if (!x.parent) root = y
      else if (x === x.parent.left) x.parent.left = y
      else x.parent.right = y
      y.left = x
      x.parent = y
    }
    const rotateRight = (y: TNode): void => {
      const x = y.left!
      rotations++
      y.left = x.right
      if (x.right) x.right.parent = y
      x.parent = y.parent
      if (!y.parent) root = x
      else if (y === y.parent.left) y.parent.left = x
      else y.parent.right = x
      x.right = y
      y.parent = x
    }
    const makeNodes = (): { nodes: TraceNode[]; edges: TraceEdge[] } => {
      const nodes: TraceNode[] = [],
        edges: TraceEdge[] = []
      const walk = (
        n: TNode | null,
        x: number,
        y: number,
        span: number,
      ): void => {
        if (!n) return
        nodes.push({ id: n.id, value: n.value, x, y, tone: n.color })
        if (n.left) {
          edges.push({ from: n.id, to: n.left.id, weight: 'left' })
          walk(n.left, x - span, y + 0.2, span / 2)
        }
        if (n.right) {
          edges.push({ from: n.id, to: n.right.id, weight: 'right' })
          walk(n.right, x + span, y + 0.2, span / 2)
        }
      }
      walk(root, 0.5, 0.13, 0.23)
      return { nodes, edges }
    }
    const check = (): {
      redRed: number
      blackHeight: number
      rootBlack: number
    } => {
      let redRed = 0
      const bh = (n: TNode | null): number => {
        if (!n) return 1
        if (
          n.color === 'red' &&
          (n.left?.color === 'red' || n.right?.color === 'red')
        )
          redRed++
        const l = bh(n.left),
          r = bh(n.right)
        if (l !== r) throw new Error('Red-black black-height invariant failed')
        return l + (n.color === 'black' ? 1 : 0)
      }
      return {
        redRed,
        blackHeight: bh(root) - 1,
        rootBlack: Number(root?.color === 'black'),
      }
    }
    for (const value of sequence) {
      const beforeRotations = rotations
      const z: TNode = {
        id: `n${value}`,
        value,
        left: null,
        right: null,
        parent: null,
        color: 'red',
      }
      let p: TNode | null = null,
        at = root
      while (at) {
        p = at
        at = value < at.value ? at.left : at.right
      }
      z.parent = p
      if (!p) root = z
      else if (value < p.value) p.left = z
      else p.right = z
      let current: TNode | null = z
      while (current && current.parent?.color === 'red') {
        const parent: TNode = current.parent,
          grand: TNode = parent.parent!
        if (parent === grand.left) {
          const uncle = grand.right
          if (uncle?.color === 'red') {
            parent.color = 'black'
            uncle.color = 'black'
            grand.color = 'red'
            current = grand
          } else {
            if (current === parent.right) {
              current = parent
              rotateLeft(current)
            }
            current.parent!.color = 'black'
            current.parent!.parent!.color = 'red'
            rotateRight(current.parent!.parent!)
          }
        } else {
          const uncle = grand.left
          if (uncle?.color === 'red') {
            parent.color = 'black'
            uncle.color = 'black'
            grand.color = 'red'
            current = grand
          } else {
            if (current === parent.left) {
              current = parent
              rotateRight(current)
            }
            current.parent!.color = 'black'
            current.parent!.parent!.color = 'red'
            rotateLeft(current.parent!.parent!)
          }
        }
      }
      root!.color = 'black'
      root!.parent = null
      const shape = makeNodes(),
        inv = check()
      frames.push({
        op: frames.length ? 'insert' : 'start',
        formula: `insert ${value} red; repair parent/uncle cases by recolor and rotation`,
        ...shape,
        counters: {
          inserted: value,
          rotations: rotations - beforeRotations,
          ...inv,
          nodes: inorder(root).length,
        },
      })
    }
    const shape = makeNodes(),
      inv = check()
    frames.push({
      op: 'done',
      formula: 'root black; no red-red edge; equal black height on every path',
      ...shape,
      counters: {
        nodes: inorder(root).length,
        ...inv,
        valid: Number(inv.redRed === 0 && inv.rootBlack === 1),
      },
    })
    return recordAll(frames)
  }),
  mission('tree-heap', (v) => {
    const a = v ? [9, 6, 8, 2, 4, 7, 1] : [8, 5, 7, 1, 3, 6, 2]
    const frames: FrameDraft[] = []
    const nodes = (heap: number[]): TraceNode[] =>
      heap.map((value, i) => {
        const d = Math.floor(Math.log2(i + 1)),
          pos = i - (2 ** d - 1)
        return {
          id: `n${value}`,
          value,
          x: 0.5 + (pos - (2 ** d - 1) / 2) * (0.82 / 2 ** d),
          y: 0.12 + d * 0.22,
        }
      })
    const edges = (heap: number[]): TraceEdge[] =>
      heap.flatMap((_, i) =>
        [2 * i + 1, 2 * i + 2]
          .filter((j) => j < heap.length)
          .map((j) => ({ from: `n${heap[i]}`, to: `n${heap[j]}` })),
      )
    let heap: number[] = []
    for (const value of a) {
      heap.push(value)
      let i = heap.length - 1
      while (i > 0) {
        const p = Math.floor((i - 1) / 2)
        if (heap[p] <= heap[i]) break
        ;[heap[p], heap[i]] = [heap[i], heap[p]]
        i = p
      }
    }
    frames.push({
      op: 'start',
      formula: 'parent(i)=⌊(i−1)/2⌋; children=2i+1,2i+2',
      nodes: nodes(heap),
      edges: edges(heap),
      counters: { size: heap.length, root: heap[0] },
    })
    const min = heap[0],
      last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let i = 0,
        comparisons = 0,
        swaps = 0
      while (true) {
        let c = 2 * i + 1
        if (c >= heap.length) break
        if (c + 1 < heap.length && heap[c + 1] < heap[c]) c++
        comparisons++
        if (heap[i] <= heap[c]) break
        ;[heap[i], heap[c]] = [heap[c], heap[i]]
        swaps++
        i = c
      }
      frames.push({
        op: 'remove',
        formula: `pop ${min}; move last item to root and sift down`,
        nodes: nodes(heap),
        edges: edges(heap),
        counters: { removed: min, size: heap.length, comparisons, swaps },
      })
    }
    const incoming = v ? 5 : 9
    heap.push(incoming)
    let i = heap.length - 1,
      ups = 0
    while (i > 0) {
      const p = Math.floor((i - 1) / 2)
      if (heap[p] <= heap[i]) break
      ;[heap[p], heap[i]] = [heap[i], heap[p]]
      i = p
      ups++
    }
    frames.push({
      op: 'insert',
      formula: `insert ${incoming}; append and sift up`,
      nodes: nodes(heap),
      edges: edges(heap),
      counters: { inserted: incoming, size: heap.length, swaps: ups },
    })
    const sorted: number[] = []
    while (heap.length) {
      const value = heap[0],
        lastValue = heap.pop()!
      sorted.push(value)
      if (heap.length) {
        heap[0] = lastValue
        let j = 0
        while (true) {
          let c = 2 * j + 1
          if (c >= heap.length) break
          if (c + 1 < heap.length && heap[c + 1] < heap[c]) c++
          if (heap[j] <= heap[c]) break
          ;[heap[j], heap[c]] = [heap[c], heap[j]]
          j = c
        }
      }
    }
    frames.push({
      op: 'done',
      formula: 'repeated extract-min emits priorities in sorted order',
      output: sorted.map((value, i) => ({ id: `out${i}`, value })),
      counters: {
        size: sorted.length,
        ordered: Number(sorted.every((x, i) => i === 0 || sorted[i - 1] <= x)),
      },
    })
    return recordAll(frames)
  }),
  mission('tree-union-find', (v) => {
    const ids = v
        ? ['A', 'B', 'C', 'D', 'E', 'F']
        : ['P', 'Q', 'R', 'S', 'T', 'U'],
      parent = ids.map((_, i) => i),
      rank = ids.map(() => 0),
      frames: FrameDraft[] = []
    const find = (x: number, compress: boolean): number => {
      if (parent[x] === x) return x
      const root = find(parent[x], compress)
      if (compress) parent[x] = root
      return root
    }
    const snap = (
      op: TraceFrame['op'],
      formula: string,
      extra: Record<string, number | string> = {},
    ): FrameDraft => ({
      op,
      formula,
      nodes: ids.map((id, i) => ({
        id,
        value: id,
        x: (i + 0.5) / ids.length,
        y: 0.18 + parent[i] * 0.115,
      })),
      edges: ids.flatMap((id, i) =>
        parent[i] === i ? [] : [{ from: id, to: ids[parent[i]] }],
      ),
      counters: {
        components: new Set(parent.map((_, i) => find(i, false))).size,
        ...extra,
      },
    })
    frames.push(
      snap('start', 'find(x) follows parent links to a set representative', {
        sets: 6,
        finds: 0,
      }),
    )
    const union = (a: number, b: number): void => {
      let x = find(a, true),
        y = find(b, true)
      if (x === y) return
      if (rank[x] < rank[y]) [x, y] = [y, x]
      parent[y] = x
      if (rank[x] === rank[y]) rank[x]++
    }
    union(0, 1)
    union(2, 3)
    union(0, 2)
    frames.push(
      snap(
        'merge',
        'union by rank attaches the shallower representative below the deeper one',
        { unions: 3, rankMax: Math.max(...rank) },
      ),
    )
    const pathBefore: number[] = []
    let at = 3
    while (parent[at] !== at) {
      pathBefore.push(at)
      at = parent[at]
    }
    const rep = find(3, true)
    frames.push(
      snap(
        'select',
        'path compression redirects every visited node to its representative',
        { find: 3, representative: ids[rep], parentWrites: pathBefore.length },
      ),
    )
    frames.push(
      snap('done', 'union-find preserves sets while compressing parent paths', {
        components: new Set(parent.map((_, i) => find(i, true))).size,
        rankMax: Math.max(...rank),
      }),
    )
    return recordAll(frames)
  }),
  mission('tree-trie', (v) => {
    const words = v ? ['car', 'cat', 'dog'] : ['to', 'tea', 'ten']
    type Trie = {
      id: string
      char: string
      children: Map<string, Trie>
      terminal: boolean
    }
    const root: Trie = {
      id: 'root',
      char: '∅',
      children: new Map(),
      terminal: false,
    }
    let serial = 0
    const frames: FrameDraft[] = []
    const insert = (word: string): void => {
      let n = root
      for (const char of word) {
        let child = n.children.get(char)
        if (!child) {
          child = {
            id: `t${serial++}`,
            char,
            children: new Map(),
            terminal: false,
          }
          n.children.set(char, child)
        }
        n = child
      }
      n.terminal = true
    }
    const render = (
      op: TraceFrame['op'],
      formula: string,
      extra: Record<string, number | string> = {},
    ): FrameDraft => {
      const nodes: TraceNode[] = [],
        edges: TraceEdge[] = []
      const walk = (n: Trie, x: number, y: number, span: number): void => {
        nodes.push({
          id: n.id,
          value: n.char + (n.terminal ? '✓' : ''),
          x,
          y,
          tone: n.terminal ? 'settled' : undefined,
        })
        const children = [...n.children.values()]
        children.forEach((c, i) => {
          edges.push({ from: n.id, to: c.id, weight: c.char })
          walk(
            c,
            x + (i - (children.length - 1) / 2) * span,
            y + 0.19,
            span / Math.max(1, children.length),
          )
        })
      }
      walk(root, 0.5, 0.1, 0.48)
      return {
        op,
        formula,
        nodes,
        edges,
        counters: {
          words: [...words.slice(0, frames.length)].length,
          nodes: nodes.length,
          ...extra,
        },
      }
    }
    frames.push(
      render('start', 'trie nodes represent shared prefixes', { words: 0 }),
    )
    for (const word of words) {
      insert(word)
      frames.push(
        render('insert', `insert ${word}: reuse existing prefix nodes`, {
          inserted: word,
          terminalCount: words.slice(0, frames.length).length + 1,
        }),
      )
    }
    const search = (word: string): boolean => {
      let n = root
      for (const c of word) {
        const next = n.children.get(c)
        if (!next) return false
        n = next
      }
      return n.terminal
    }
    const matches = words.map((word) => ({
      id: `word-${word}`,
      value: `${word}:${search(word)}`,
    }))
    frames.push({
      ...render(
        'select',
        'digital search follows successive symbols or key digits',
        { lookups: words.length },
      ),
      output: matches,
    })
    frames.push(
      render('done', 'each complete key ends at an explicit terminal marker', {
        words: words.length,
        terminalMarkers: words.filter(search).length,
      }),
    )
    return recordAll(frames)
  }),
  mission('tree-optimal-search', (v) => {
    const keys = v ? ['A', 'B', 'C', 'D'] : ['P', 'Q', 'R', 'S'],
      weights = v ? [8, 3, 6, 2] : [2, 7, 4, 3]
    type O = {
      id: string
      value: string
      weight: number
      left: O | null
      right: O | null
    }
    const build = (lo: number, hi: number): O | null => {
      if (lo >= hi) return null
      let best = lo,
        bestDiff = Infinity
      for (let i = lo; i < hi; i++) {
        const left = weights.slice(lo, i).reduce((a, b) => a + b, 0),
          right = weights.slice(i + 1, hi).reduce((a, b) => a + b, 0),
          diff = Math.abs(left - right)
        if (diff < bestDiff) {
          best = i
          bestDiff = diff
        }
      }
      return {
        id: `o${keys[best]}`,
        value: keys[best],
        weight: weights[best],
        left: build(lo, best),
        right: build(best + 1, hi),
      }
    }
    const root = build(0, keys.length),
      nodes: TraceNode[] = [],
      edges: TraceEdge[] = []
    const walk = (
      n: O | null,
      x: number,
      y: number,
      span: number,
      depth: number,
    ): number => {
      if (!n) return 0
      nodes.push({ id: n.id, value: n.value, x, y })
      let cost = n.weight * (depth + 1)
      if (n.left) {
        edges.push({ from: n.id, to: n.left.id, weight: 'left' })
        cost += walk(n.left, x - span, y + 0.22, span / 2, depth + 1)
      }
      if (n.right) {
        edges.push({ from: n.id, to: n.right.id, weight: 'right' })
        cost += walk(n.right, x + span, y + 0.22, span / 2, depth + 1)
      }
      return cost
    }
    const weightedCost = walk(root, 0.5, 0.15, 0.24, 0),
      total = weights.reduce((a, b) => a + b, 0),
      out = keys.map((key, i) => ({
        id: `w${key}`,
        value: `${key}:${weights[i]}`,
      }))
    const first = recordAll([
      {
        op: 'start',
        formula:
          'weighted heuristic balances cumulative left and right access weights',
        nodes: keys.map((value, i) => ({
          id: `o${value}`,
          value,
          x: (i + 0.5) / keys.length,
          y: 0.75,
        })),
        counters: { keys: keys.length, totalWeight: total },
      },
    ])
    const final = recordAll([
      {
        op: 'done',
        formula:
          'weighted search cost = Σ frequency × (depth + 1); this heuristic is not OBST DP',
        nodes,
        edges,
        counters: { weightedCost, heuristic: 1, obstSolved: 0 },
      },
    ])
    return [
      ...first,
      ...recordAll([
        {
          op: 'select',
          formula:
            'choose the root minimizing |left weight − right weight| in each ordered interval',
          nodes,
          edges,
          output: out,
          counters: { weightedCost },
        },
      ]),
      ...final,
    ]
  }),
]
