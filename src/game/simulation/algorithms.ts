import type { CourseMission, TraceFrame, TraceItem } from '../types'
import { record } from './trace'
type Chapter = 'divide' | 'greedy' | 'dynamic'
const defs: [string, Chapter][] = [
  ...[
    'divide-recursion-tree',
    'divide-master-theorem',
    'divide-hanoi',
    'divide-quickselect',
    'divide-closest-pair',
    'divide-strassen',
    'divide-fft',
    'divide-comparison-lower-bound',
    'divide-matrix-multiply',
  ].map((x) => [x, 'divide']),
  ...[
    'greedy-fractional-knapsack',
    'greedy-job-deadline',
    'greedy-activity-selection',
    'greedy-johnson-flowshop',
  ].map((x) => [x, 'greedy']),
  ...[
    'dp-knapsack-01',
    'dp-matrix-chain',
    'dp-optimal-bst',
    'dp-lcs',
    'dp-flowshop-exact',
  ].map((x) => [x, 'dynamic']),
] as [string, Chapter][]
const dat = [
  [7, 3, 5, 2, 6, 1],
  [4, 1, 6, 2, 5, 3],
]
function initial(id: string, v: 0 | 1): unknown {
  if (id === 'divide-recursion-tree')
    return { recurrence: 'T(n)=2T(n/2)+n', n: v ? 8 : 16 }
  if (id === 'divide-master-theorem')
    return {
      cases: v
        ? [
            [1, 3, 2],
            [3, 3, 1],
            [4, 2, 1],
          ]
        : [
            [1, 2, 2],
            [2, 2, 1],
            [2, 2, 0],
          ],
      form: 'T(n)=aT(n/b)+Theta(n^d)',
    }
  if (id === 'divide-comparison-lower-bound')
    return { n: v ? 7 : 8, distinctKeys: true, model: 'comparison sorting' }
  if (id === 'divide-hanoi')
    return { disks: v ? 2 : 3, from: 'A', to: 'C', auxiliary: 'B' }
  if (id === 'divide-quickselect')
    return { values: dat[v], rank: v ? 5 : 4, seed: 12345 }
  if (id === 'divide-closest-pair')
    return v
      ? [
          [0, 0],
          [2, 1],
          [3, 5],
          [5, 2],
          [6, 6],
          [8, 3],
        ]
      : [
          [0, 0],
          [1, 5],
          [2, 2],
          [4, 4],
          [5, 1],
          [7, 3],
        ]
  if (id === 'divide-matrix-multiply')
    return v
      ? {
          A: [
            [2, 1, 0, 3],
            [0, 4, 2, 1],
            [3, 0, 1, 2],
            [1, 2, 3, 0],
          ],
          B: [
            [1, 0, 2, 1],
            [3, 2, 0, 1],
            [0, 1, 3, 2],
            [2, 1, 1, 0],
          ],
          blockSize: 2,
        }
      : {
          A: [
            [1, 2, 0, 1],
            [3, 1, 2, 0],
            [0, 2, 1, 3],
            [2, 0, 3, 1],
          ],
          B: [
            [2, 0, 1, 3],
            [1, 2, 0, 1],
            [3, 1, 2, 0],
            [0, 2, 1, 2],
          ],
          blockSize: 2,
        }
  if (id === 'divide-strassen')
    return v
      ? {
          A: [
            [2, 0],
            [1, 3],
          ],
          B: [
            [4, 1],
            [2, 5],
          ],
        }
      : {
          A: [
            [1, 2],
            [3, 4],
          ],
          B: [
            [5, 6],
            [7, 8],
          ],
        }
  if (id === 'divide-fft')
    return {
      realInput: v ? [1, 0, 1, 0] : [1, 2, 0, 0],
      imaginaryInput: [0, 0, 0, 0],
    }
  if (id === 'greedy-fractional-knapsack')
    return v
      ? {
          capacity: 20,
          items: [
            [5, 30],
            [10, 50],
            [15, 60],
          ],
        }
      : {
          capacity: 50,
          items: [
            [10, 60],
            [20, 100],
            [30, 120],
          ],
        }
  if (id === 'greedy-job-deadline')
    return v
      ? [
          ['A', 1, 35],
          ['B', 3, 30],
          ['C', 2, 25],
          ['D', 2, 20],
        ]
      : [
          ['A', 2, 100],
          ['B', 1, 19],
          ['C', 2, 27],
          ['D', 1, 25],
          ['E', 3, 15],
        ]
  if (id === 'greedy-activity-selection')
    return v
      ? [
          [1, 3],
          [2, 5],
          [4, 7],
          [6, 9],
          [8, 10],
          [9, 12],
        ]
      : [
          [1, 4],
          [3, 5],
          [0, 6],
          [5, 7],
          [3, 9],
          [5, 9],
          [6, 10],
          [8, 11],
          [8, 12],
          [2, 14],
          [12, 16],
        ]
  if (id === 'greedy-johnson-flowshop')
    return v
      ? {
          jobs: [
            ['A', 7, 3],
            ['B', 2, 8],
            ['C', 6, 5],
            ['D', 4, 9],
          ],
          machines: 2,
        }
      : {
          jobs: [
            ['A', 3, 8],
            ['B', 12, 2],
            ['C', 5, 6],
            ['D', 4, 9],
          ],
          machines: 2,
        }
  if (id === 'dp-knapsack-01')
    return v
      ? {
          items: [
            [1, 2],
            [3, 5],
            [4, 7],
            [5, 8],
          ],
          capacity: 7,
        }
      : {
          items: [
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 8],
          ],
          capacity: 8,
        }
  if (id === 'dp-matrix-chain')
    return { dimensions: v ? [5, 10, 3, 12, 5] : [10, 30, 5, 60] }
  if (id === 'dp-optimal-bst')
    return {
      keys: ['A', 'B', 'C', 'D'],
      successful: v ? [0.2, 0.08, 0.28, 0.24] : [0.08, 0.16, 0.32, 0.24],
      unsuccessful: [0.04, 0.04, 0.04, 0.04, 0.04],
    }
  if (id === 'dp-lcs')
    return v ? { x: 'XMJYAUZ', y: 'MZJAWXU' } : { x: 'ABCBDAB', y: 'BDCABA' }
  return v
    ? {
        jobs: [
          [2, 4],
          [3, 2],
          [1, 3],
          [4, 1],
        ],
        machines: 2,
      }
    : {
        jobs: [
          [3, 5],
          [2, 1],
          [4, 3],
          [1, 4],
        ],
        machines: 2,
      }
}

function terminalOutput(id: string, value: unknown): TraceItem[] {
  if (value === null || typeof value !== 'object') return []
  if (
    Array.isArray(value) &&
    id !== 'divide-fft' &&
    id !== 'greedy-activity-selection'
  )
    return []
  const result = value as Record<string, unknown>
  const scalar = (key: string, label: string): TraceItem | null => {
    const item = result[key]
    return typeof item === 'number' || typeof item === 'string'
      ? { id: `result-${key}`, value: item, label }
      : null
  }
  const values = (...fields: [string, string][]) =>
    fields
      .map(([key, label]) => scalar(key, label))
      .filter((x): x is TraceItem => x !== null)

  switch (id) {
    case 'divide-recursion-tree':
      return values(['totalWork', 'total work'])
    case 'divide-master-theorem':
      return values(['order', 'dominant order'])
    case 'divide-comparison-lower-bound':
      return values(['lowerBound', 'comparison lower bound'])
    case 'divide-hanoi':
      return values(['moves', 'minimum moves'])
    case 'divide-quickselect':
      return values(['value', 'selected value'])
    case 'divide-closest-pair':
      return values(['distance', 'closest distance'])
    case 'divide-matrix-multiply':
    case 'divide-strassen': {
      const matrix = result.C as number[][] | undefined
      return (
        matrix?.flatMap((row, i) =>
          row.map((cell, j) => ({
            id: `C${i}${j}`,
            value: cell,
            label: `C[${i + 1},${j + 1}]`,
          })),
        ) ?? []
      )
    }
    case 'divide-fft': {
      const spectrum = result as unknown as [number, number][]
      return spectrum.map(([re, im], i) => ({
        id: `X${i}`,
        value: `${re}${im < 0 ? '' : '+'}${Object.is(im, -0) ? 0 : im}i`,
        label: `X[${i}]`,
      }))
    }
    case 'greedy-fractional-knapsack':
      return values(['value', 'total value'])
    case 'greedy-job-deadline': {
      const slots = result.slots as (string | undefined)[] | undefined
      return [
        ...(slots ?? []).map((job, i) => ({
          id: `slot-${i + 1}`,
          value: job ?? 'empty',
          label: `slot ${i + 1}`,
        })),
        ...values(['profit', 'total profit']),
      ]
    }
    case 'greedy-activity-selection': {
      const selected = value as number[][]
      return selected.map(([start, finish], i) => ({
        id: `activity-${i}`,
        value: `${start}–${finish}`,
        label: `activity ${i + 1}`,
      }))
    }
    case 'greedy-johnson-flowshop': {
      const order = (result.order as string[] | undefined) ?? []
      return [
        { id: 'job-order', value: order.join(' → '), label: 'Johnson order' },
        ...values(['makespan', 'makespan']),
      ]
    }
    case 'dp-knapsack-01': {
      const items = result.items as
        | { id: number; weight: number; value: number }[]
        | undefined
      return [
        ...(items ?? []).map((item) => ({
          id: `item-${item.id}`,
          value: `w=${item.weight}, v=${item.value}`,
          label: `item ${item.id}`,
        })),
        ...values(['value', 'optimal value']),
      ]
    }
    case 'dp-matrix-chain':
      return [
        ...values(['parenthesization', 'optimal order']),
        ...values(['minMultiplications', 'minimum multiplications']),
      ]
    case 'dp-optimal-bst':
      return values(['expectedCost', 'expected search cost'])
    case 'dp-lcs':
      return [
        ...values(['lcs', 'longest common subsequence']),
        ...values(['length', 'length']),
      ]
    case 'dp-flowshop-exact': {
      const order = (result.order as number[] | undefined) ?? []
      return [
        {
          id: 'job-order',
          value: order.map((job) => `J${job}`).join(' → '),
          label: 'optimal order',
        },
        ...values(['makespan', 'minimum makespan']),
      ]
    }
    default:
      return []
  }
}

function sim(id: string, v: 0 | 1): TraceFrame[] {
  const f: TraceFrame[] = []
  const add = (
    op: TraceFrame['op'],
    formula: string,
    result: unknown,
    counters: Record<string, number | string>,
    matrix?: TraceFrame['matrix'],
    view: Partial<TraceFrame> = {},
  ) => {
    const previous = f.at(-1)
    const explicitView = matrix !== undefined || Object.keys(view).length > 0
    const inherited: Partial<TraceFrame> =
      !explicitView && previous
        ? {
            items: previous.items,
            nodes: previous.nodes,
            edges: previous.edges,
            groups: previous.groups,
            matrix: previous.matrix,
          }
        : {}
    const output = op === 'done' ? terminalOutput(id, result) : undefined
    record(f, {
      op,
      formula,
      counters,
      result,
      ...(output?.length ? { output } : {}),
      ...inherited,
      ...(matrix ? { matrix } : {}),
      ...view,
    })
  }
  const keyItems = (xs: number[], active: number[] = []) =>
    xs.map((value, index) => ({
      id: `key-${value}`,
      value,
      label: `index ${index}`,
      tone: active.includes(index) ? ('active' as const) : undefined,
    }))
  const hanoiGroups = (pegs: Record<string, number[]>) =>
    Object.entries(pegs).map(([id, disks]) => ({
      id,
      items: disks.map((d) => ({
        id: `disk-${d}`,
        value: d,
        label: `disk ${d}`,
        tone: 'settled' as const,
      })),
    }))
  const hanoiN = v ? 2 : 3
  const startData = initial(id, v)
  const startPoints =
    id === 'divide-closest-pair' ? (startData as number[][]) : []
  const minX = Math.min(...startPoints.map((p) => p[0]!))
  const maxX = Math.max(...startPoints.map((p) => p[0]!))
  const minY = Math.min(...startPoints.map((p) => p[1]!))
  const maxY = Math.max(...startPoints.map((p) => p[1]!))
  const coords =
    id === 'divide-closest-pair'
      ? startPoints.map(([x, y], i) => ({
          id: `P${i}`,
          value: `(${x},${y})`,
          label: `P${i}`,
          x:
            0.08 + ((x! - minX) / Math.max(1, maxX - minX, maxY - minY)) * 0.84,
          y:
            0.92 - ((y! - minY) / Math.max(1, maxX - minX, maxY - minY)) * 0.84,
        }))
      : undefined
  const matrixData = startData as { A?: number[][]; B?: number[][] }
  const matrixGroups =
    matrixData.A && matrixData.B
      ? [
          {
            id: 'matrix-A',
            items: matrixData.A.flatMap((row, i) =>
              row.map((value, j) => ({
                id: `A${i}${j}`,
                value,
                label: `A[${i},${j}]`,
              })),
            ),
          },
          {
            id: 'matrix-B',
            items: matrixData.B.flatMap((row, i) =>
              row.map((value, j) => ({
                id: `B${i}${j}`,
                value,
                label: `B[${i},${j}]`,
              })),
            ),
          },
        ]
      : undefined
  const firstView: Partial<TraceFrame> =
    id === 'divide-recursion-tree'
      ? { items: [{ id: 'root-problem', value: v ? 8 : 16, label: 'root n' }] }
      : id === 'divide-master-theorem'
        ? {
            groups: (startData as { cases: number[][] }).cases.map(
              ([a, b, d], i) => ({
                id: `case-${i + 1}`,
                items: [
                  { id: `a-${i}`, value: a!, label: 'branch factor a' },
                  { id: `b-${i}`, value: b!, label: 'shrink factor b' },
                  { id: `d-${i}`, value: d!, label: 'outside exponent d' },
                ],
              }),
            ),
          }
        : id === 'divide-comparison-lower-bound'
          ? {
              items: [
                {
                  id: 'permutations',
                  value: v ? 7 : 8,
                  label: 'distinct keys n',
                },
              ],
            }
          : id === 'divide-hanoi'
            ? {
                groups: hanoiGroups({
                  A: Array.from({ length: hanoiN }, (_, i) => hanoiN - i),
                  B: [],
                  C: [],
                }),
              }
            : id === 'divide-quickselect'
              ? { items: keyItems(dat[v]!) }
              : id === 'divide-fft'
                ? {
                    groups: [
                      {
                        id: 'input-samples',
                        items: (v ? [1, 0, 1, 0] : [1, 2, 0, 0]).map(
                          (value, i) => ({
                            id: `x${i}`,
                            value,
                            label: `x[${i}]`,
                          }),
                        ),
                      },
                    ],
                  }
                : id === 'greedy-fractional-knapsack'
                  ? {
                      groups: [
                        {
                          id: 'candidate-items',
                          items: (startData as { items: number[][] }).items.map(
                            ([w, value], i) => ({
                              id: `item-${i}`,
                              value: `w=${w}, v=${value}`,
                              label: `item ${i + 1}`,
                            }),
                          ),
                        },
                      ],
                    }
                  : id === 'greedy-job-deadline'
                    ? {
                        groups: [
                          {
                            id: 'job-candidates',
                            items: (
                              startData as [string, number, number][]
                            ).map(([job, deadline, profit]) => ({
                              id: `job-${job}`,
                              value: `profit ${profit}, deadline ${deadline}`,
                              label: job,
                            })),
                          },
                          {
                            id: 'schedule',
                            items: Array.from(
                              { length: v ? 3 : 3 },
                              (_, i) => ({
                                id: `slot-${i + 1}`,
                                value: 'empty',
                                label: `slot ${i + 1}`,
                              }),
                            ),
                          },
                        ],
                      }
                    : id === 'greedy-activity-selection'
                      ? {
                          items: (startData as number[][]).map(
                            ([start, finish], i) => ({
                              id: `activity-${i}`,
                              value: `${start}–${finish}`,
                              label: 'start–finish',
                            }),
                          ),
                        }
                      : id === 'greedy-johnson-flowshop'
                        ? {
                            groups: [
                              {
                                id: 'jobs',
                                items: (
                                  startData as {
                                    jobs: [string, number, number][]
                                  }
                                ).jobs.map(([job, a, b]) => ({
                                  id: `job-${job}`,
                                  value: `M1 ${a}, M2 ${b}`,
                                  label: job,
                                })),
                              },
                            ],
                          }
                        : id === 'dp-knapsack-01'
                          ? {
                              groups: [
                                {
                                  id: 'items',
                                  items: (
                                    startData as { items: number[][] }
                                  ).items.map(([weight, value], i) => ({
                                    id: `item-${i + 1}`,
                                    value: `w=${weight}, v=${value}`,
                                    label: `item ${i + 1}`,
                                  })),
                                },
                              ],
                            }
                          : id === 'dp-matrix-chain'
                            ? {
                                items: (
                                  startData as { dimensions: number[] }
                                ).dimensions.map((dimension, i) => ({
                                  id: `dimension-${i}`,
                                  value: dimension,
                                  label: `p${i}`,
                                })),
                              }
                            : id === 'dp-optimal-bst'
                              ? {
                                  groups: [
                                    {
                                      id: 'successful-searches',
                                      items: (
                                        startData as {
                                          keys: string[]
                                          successful: number[]
                                        }
                                      ).keys.map((key, i) => ({
                                        id: `key-${key}`,
                                        value: (
                                          startData as { successful: number[] }
                                        ).successful[i]!,
                                        label: key,
                                      })),
                                    },
                                    {
                                      id: 'unsuccessful-searches',
                                      items: (
                                        startData as { unsuccessful: number[] }
                                      ).unsuccessful.map((probability, i) => ({
                                        id: `gap-${i}`,
                                        value: probability,
                                        label: `q${i}`,
                                      })),
                                    },
                                  ],
                                }
                              : id === 'dp-lcs'
                                ? {
                                    groups: [
                                      {
                                        id: 'sequence-x',
                                        items: (startData as { x: string }).x
                                          .split('')
                                          .map((value, i) => ({
                                            id: `x${i}`,
                                            value,
                                            label: `x${i + 1}`,
                                          })),
                                      },
                                      {
                                        id: 'sequence-y',
                                        items: (startData as { y: string }).y
                                          .split('')
                                          .map((value, i) => ({
                                            id: `y${i}`,
                                            value,
                                            label: `y${i + 1}`,
                                          })),
                                      },
                                    ],
                                  }
                                : id === 'dp-flowshop-exact'
                                  ? {
                                      groups: [
                                        {
                                          id: 'jobs',
                                          items: (
                                            startData as { jobs: number[][] }
                                          ).jobs.map(([a, b], i) => ({
                                            id: `job-${i + 1}`,
                                            value: `M1 ${a}, M2 ${b}`,
                                            label: `J${i + 1}`,
                                          })),
                                        },
                                      ],
                                    }
                                  : coords
                                    ? { nodes: coords }
                                    : matrixGroups
                                      ? { groups: matrixGroups }
                                      : {}
  add(
    'start',
    'problem instance and its selected parameters',
    startData,
    { variant: v },
    undefined,
    firstView,
  )
  if (id === 'divide-recursion-tree') {
    let n = v ? 8 : 16,
      i = 0,
      sum = 0
    const levels = []
    for (; n >= 1; n /= 2, i++) {
      const count = 2 ** i,
        work = count * n,
        level = {
          depth: i,
          subproblems: count,
          problemSize: n,
          levelWork: work,
        }
      levels.push(level)
      sum += work
      add(
        'visit',
        `level ${i}: ${count} × ${n} = ${work} work`,
        level,
        { depth: i, subproblems: count, totalWork: sum },
        undefined,
        {
          items: levels.map((row, index) => ({
            id: `level-${index}`,
            value: row.levelWork,
            label: `depth ${index}: ${row.subproblems} × ${row.problemSize}`,
          })),
        },
      )
    }
    add(
      'done',
      'sum the displayed level costs, including leaves',
      { levels, totalWork: sum },
      { levels: i, totalWork: sum },
    )
  } else if (id === 'divide-master-theorem') {
    for (const [a, b, d] of v
      ? [
          [1, 3, 2],
          [3, 3, 1],
          [4, 2, 1],
        ]
      : [
          [1, 2, 2],
          [2, 2, 1],
          [2, 2, 0],
        ]) {
      const p = Math.log(a!) / Math.log(b!)
      add(
        'update',
        `T(n)=aT(n/b)+Theta(n^d), n>=b; case 3 additionally needs regularity; d=${d}, log_b(a)=${p}`,
        {
          a,
          b,
          d,
          p,
          order:
            d! > p
              ? `Theta(n^${d})`
              : d === p
                ? `Theta(n^${d} log n)`
                : `Theta(n^${p})`,
        },
        { cases: 3 },
        undefined,
        {
          items: [
            { id: 'a', value: a, label: 'branch factor a' },
            { id: 'b', value: b, label: 'shrink factor b' },
            { id: 'd', value: d, label: 'external work exponent d' },
            { id: 'critical', value: p, label: 'log_b(a)' },
            {
              id: 'order',
              value:
                d! > p
                  ? `Theta(n^${d})`
                  : d === p
                    ? `Theta(n^${d} log n)`
                    : `Theta(n^${p})`,
              label: 'dominant order',
            },
          ],
        },
      )
    }
  } else if (id === 'divide-comparison-lower-bound') {
    const n = v ? 7 : 8
    let leaves = 1
    for (let i = 2; i <= n; i++) {
      leaves *= i
      add(
        'update',
        `after factor ${i}, permutations = ${leaves}`,
        { n, partialFactorial: leaves },
        { factor: i, leaves },
      )
    }
    const lowerBound = Math.ceil(Math.log2(leaves))
    add(
      'done',
      `2^h >= ${leaves}, therefore h >= ceil(log2(${leaves})) = ${lowerBound}; distinct keys, comparison model`,
      { n, leaves, lowerBound },
      { distinctKeys: n, leaves, comparisons: lowerBound },
      undefined,
      {
        items: [
          {
            id: 'leaves',
            value: leaves,
            label: 'required decision-tree leaves',
          },
          {
            id: 'height',
            value: lowerBound,
            label: 'minimum worst-case comparisons',
          },
        ],
      },
    )
  } else if (id === 'divide-hanoi') {
    const m: string[] = []
    const n = v ? 2 : 3,
      pegs: Record<string, number[]> = {
        A: Array.from({ length: n }, (_, i) => n - i),
        B: [],
        C: [],
      }
    const go = (k: number, a: string, b: string, c: string): void => {
      if (!k) return
      go(k - 1, a, c, b)
      const disk = pegs[a]!.pop()!
      pegs[b]!.push(disk)
      m.push(`${a}->${b}`)
      add(
        'update',
        `move top disk ${disk}: ${a} → ${b}; destination top is ${pegs[b]!.at(-2) ?? 'empty'}`,
        { disk, from: a, to: b, moves: [...m] },
        { disks: n, moves: m.length },
        undefined,
        { groups: hanoiGroups(pegs) },
      )
      go(k - 1, c, b, a)
    }
    go(n, 'A', 'C', 'B')
    add(
      'done',
      'H(n)=2H(n−1)+1; minimum moves = 2^n−1',
      m,
      { disks: n, moves: m.length },
      undefined,
      { groups: hanoiGroups(pegs) },
    )
  } else if (id === 'divide-quickselect') {
    const a = [...dat[v]!],
      k = v ? 4 : 3
    let seed = 12345,
      cmp = 0
    const rnd = (n: number) => {
      seed = (seed * 16807) % 2147483647
      return seed % n
    }
    let l = 0,
      r = a.length - 1
    while (l <= r) {
      const pi = l + rnd(r - l + 1),
        p = a[pi]!
      ;[a[pi], a[r]] = [a[r]!, a[pi]!]
      add(
        'select',
        `seed ${seed} chose pivot ${p}; move pivot to partition boundary`,
        a,
        { low: l, high: r, pivot: p, comparisons: cmp, seed },
        undefined,
        { items: keyItems(a, [r]) },
      )
      let q = l
      for (let j = l; j < r; j++) {
        cmp++
        const less = a[j]! < p
        add(
          'compare',
          `${a[j]} < ${p} is ${less}; scan index ${j}`,
          a,
          { index: j, pivot: p, comparisons: cmp, seed },
          undefined,
          { items: keyItems(a, [j, r]) },
        )
        if (less) {
          ;[a[j], a[q]] = [a[q]!, a[j]!]
          add(
            'swap',
            `swap stable keys at indices ${j} and ${q}`,
            a,
            { left: j, right: q, comparisons: cmp, seed },
            undefined,
            { items: keyItems(a, [j, q]) },
          )
          q++
        }
      }
      ;[a[q], a[r]] = [a[r]!, a[q]!]
      add(
        'update',
        `pivot ${p} settles at index ${q}; target index ${k}`,
        a,
        { pivot: p, pivotIndex: q, rank: k + 1, comparisons: cmp, seed },
        undefined,
        { items: keyItems(a, [q]) },
      )
      if (q === k) break
      if (q < k) l = q + 1
      else r = q - 1
    }
    add(
      'done',
      'selected value at zero-based index k',
      { rank: k + 1, value: a[k] },
      { comparisons: cmp, seed },
      undefined,
      { items: keyItems(a, [k]) },
    )
  } else if (id === 'divide-closest-pair') {
    const pts = (
      v
        ? [
            [0, 0],
            [2, 1],
            [3, 5],
            [5, 2],
            [6, 6],
            [8, 3],
          ]
        : [
            [0, 0],
            [1, 5],
            [2, 2],
            [4, 4],
            [5, 1],
            [7, 3],
          ]
    ).map((p, i) => ({ id: `P${i}`, x: p[0]!, y: p[1]! }))
    let best = Infinity,
      pair: string[] = [],
      checks = 0
    type P = (typeof pts)[number]
    const minX = Math.min(...pts.map((p) => p.x))
    const maxX = Math.max(...pts.map((p) => p.x))
    const minY = Math.min(...pts.map((p) => p.y))
    const maxY = Math.max(...pts.map((p) => p.y))
    const nodes = (active: string[] = []): TraceFrame['nodes'] =>
      pts.map((p) => ({
        id: p.id,
        value: `(${p.x},${p.y})`,
        label: p.id,
        x: 0.08 + ((p.x - minX) / Math.max(1, maxX - minX, maxY - minY)) * 0.84,
        y: 0.92 - ((p.y - minY) / Math.max(1, maxX - minX, maxY - minY)) * 0.84,
        tone: active.includes(p.id) ? 'active' : undefined,
      }))
    const view = (
      active: string[] = [],
      strip: string[] = [],
      candidate?: [string, string],
      groups?: TraceFrame['groups'],
    ): Partial<TraceFrame> => ({
      nodes: nodes(active),
      edges: [
        ...(pair.length
          ? [
              {
                from: pair[0]!,
                to: pair[1]!,
                weight: best.toFixed(2),
                tone: 'settled' as const,
              },
            ]
          : []),
        ...(candidate
          ? [
              {
                from: candidate[0],
                to: candidate[1],
                weight: 'candidate',
                tone: 'active' as const,
              },
            ]
          : []),
      ],
      ...(groups
        ? { groups }
        : strip.length
          ? {
              groups: [
                {
                  id: 'x-strip',
                  items: strip.map((id) => ({
                    id,
                    value: id,
                    tone: 'active' as const,
                  })),
                },
              ],
            }
          : {}),
    })
    const rec = (xs: P[], depth = 0): void => {
      if (xs.length <= 3) {
        add(
          'visit',
          `base case depth ${depth}: compare local point pairs`,
          xs.map((p) => `${p.id}(${p.x},${p.y})`),
          { depth, size: xs.length, best: Number.isFinite(best) ? best : '∞' },
          undefined,
          view(xs.map((p) => p.id)),
        )
        for (let i = 0; i < xs.length; i++)
          for (let j = i + 1; j < xs.length; j++) {
            checks++
            const left = xs[i]!,
              right = xs[j]!,
              d = Math.hypot(left.x - right.x, left.y - right.y),
              improved = d < best
            if (improved) {
              best = d
              pair = [left.id, right.id]
            }
            add(
              improved ? 'update' : 'compare',
              `${left.id},${right.id}: distance ${d.toFixed(2)}; best ${best.toFixed(2)}`,
              [left.id, right.id],
              {
                pair: pair.join(','),
                distance: d,
                best: Number.isFinite(best) ? best : '∞',
                checks,
              },
              undefined,
              view([left.id, right.id], [], [left.id, right.id]),
            )
          }
        return
      }
      const mid = xs.length >> 1,
        x = xs[mid]!.x,
        left = xs.slice(0, mid),
        right = xs.slice(mid),
        groups = [
          {
            id: 'left-half',
            items: left.map((p) => ({
              id: p.id,
              value: `(${p.x},${p.y})`,
              tone: 'active' as const,
            })),
          },
          {
            id: 'right-half',
            items: right.map((p) => ({
              id: p.id,
              value: `(${p.x},${p.y})`,
              tone: 'settled' as const,
            })),
          },
        ]
      add(
        'split',
        `split sorted x sequence at x=${x}`,
        { left: left.map((p) => p.id), right: right.map((p) => p.id) },
        {
          depth,
          size: xs.length,
          splitX: x,
          best: Number.isFinite(best) ? best : '∞',
        },
        undefined,
        view([], [], undefined, groups),
      )
      rec(left, depth + 1)
      rec(right, depth + 1)
      const strip = xs
        .filter((p) => Math.abs(p.x - x) < best)
        .sort((a, b) => a.y - b.y)
      add(
        'select',
        `strip: |x−${x}| < ${best.toFixed(2)}; scan in increasing y`,
        strip.map((p) => `${p.id}(${p.x},${p.y})`),
        {
          depth,
          stripSize: strip.length,
          best: Number.isFinite(best) ? best : '∞',
        },
        undefined,
        view(
          strip.map((p) => p.id),
          strip.map((p) => p.id),
        ),
      )
      for (let i = 0; i < strip.length; i++)
        for (let j = i + 1; j < strip.length; j++) {
          const a = strip[i]!,
            b = strip[j]!,
            dy = b.y - a.y
          if (dy >= best) {
            add(
              'reject',
              `skip ${a.id},${b.id}: dy=${dy} ≥ current best ${best.toFixed(2)}`,
              [a.id, b.id],
              { dy, best: Number.isFinite(best) ? best : '∞', checks },
              undefined,
              view(
                [a.id, b.id],
                strip.map((p) => p.id),
              ),
            )
            break
          }
          checks++
          const d = Math.hypot(a.x - b.x, dy),
            improved = d < best
          if (improved) {
            best = d
            pair = [a.id, b.id]
          }
          add(
            improved ? 'update' : 'compare',
            `strip ${a.id},${b.id}: d=${d.toFixed(2)}; best=${best.toFixed(2)}`,
            [a.id, b.id],
            { distance: d, best: Number.isFinite(best) ? best : '∞', checks },
            undefined,
            view(
              [a.id, b.id],
              strip.map((p) => p.id),
              [a.id, b.id],
            ),
          )
        }
    }
    rec([...pts].sort((a, b) => a.x - b.x))
    add(
      'done',
      'closest pair after local and cross-strip comparisons',
      { pair, distance: best, points: pts },
      { points: pts.length, distanceChecks: checks },
      undefined,
      view(pair),
    )
  } else if (id === 'divide-matrix-multiply') {
    const A = v
        ? [
            [2, 1, 0, 3],
            [0, 4, 2, 1],
            [3, 0, 1, 2],
            [1, 2, 3, 0],
          ]
        : [
            [1, 2, 0, 1],
            [3, 1, 2, 0],
            [0, 2, 1, 3],
            [2, 0, 3, 1],
          ],
      B = v
        ? [
            [1, 0, 2, 1],
            [3, 2, 0, 1],
            [0, 1, 3, 2],
            [2, 1, 1, 0],
          ]
        : [
            [2, 0, 1, 3],
            [1, 2, 0, 1],
            [3, 1, 2, 0],
            [0, 2, 1, 2],
          ],
      C = Array.from({ length: 4 }, () => Array(4).fill(0))
    let products = 0
    for (let ii = 0; ii < 4; ii += 2)
      for (let jj = 0; jj < 4; jj += 2)
        for (let kk = 0; kk < 4; kk += 2) {
          const Atile = A.slice(ii, ii + 2).map((row) => row.slice(kk, kk + 2)),
            Btile = B.slice(kk, kk + 2).map((row) => row.slice(jj, jj + 2))
          add(
            'select',
            `load A[${ii}..${ii + 1},${kk}..${kk + 1}] and B[${kk}..${kk + 1},${jj}..${jj + 1}] tiles into the working block`,
            {
              Atile,
              Btile,
              Ctile: C.slice(ii, ii + 2).map((row) => row.slice(jj, jj + 2)),
            },
            { blockRows: ii, blockColumns: jj, blockInner: kk, blockSize: 2 },
            undefined,
            {
              groups: [
                {
                  id: 'A-input-tile',
                  items: Atile.flatMap((row, r) =>
                    row.map((value, c) => ({
                      id: `A${ii + r}${kk + c}`,
                      value,
                      label: `A[${ii + r},${kk + c}]`,
                    })),
                  ),
                },
                {
                  id: 'B-input-tile',
                  items: Btile.flatMap((row, r) =>
                    row.map((value, c) => ({
                      id: `B${kk + r}${jj + c}`,
                      value,
                      label: `B[${kk + r},${jj + c}]`,
                    })),
                  ),
                },
                {
                  id: 'C-accumulator-tile',
                  items: C.slice(ii, ii + 2).flatMap((row, r) =>
                    row.slice(jj, jj + 2).map((value, c) => ({
                      id: `C${ii + r}${jj + c}`,
                      value,
                      label: `C[${ii + r},${jj + c}]`,
                    })),
                  ),
                },
              ],
            },
          )
          for (let i = ii; i < ii + 2; i++)
            for (let j = jj; j < jj + 2; j++)
              for (let k = kk; k < kk + 2; k++) {
                const term = A[i]![k]! * B[k]![j]!
                C[i]![j] += term
                products++
                add(
                  'update',
                  `block accumulator C[${i},${j}] += A[${i},${k}]×B[${k},${j}] = ${term}; partial=${C[i]![j]}`,
                  {
                    Ablock: Atile,
                    Bblock: Btile,
                    Cblock: C.slice(ii, ii + 2).map((row) =>
                      row.slice(jj, jj + 2),
                    ),
                    cell: [i, j],
                    k,
                  },
                  { scalarProducts: products, blockSize: 2, blockInner: kk },
                  {
                    rows: ['row 0', 'row 1'],
                    columns: ['col 0', 'col 1'],
                    values: C.slice(ii, ii + 2).map((row) =>
                      row.slice(jj, jj + 2),
                    ),
                    active: [i - ii, j - jj],
                  },
                )
              }
        }
    const ref = Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (_, j) =>
        A[i]!.reduce((sum, a, k) => sum + a * B[k]![j]!, 0),
      ),
    )
    add(
      'done',
      'blocked result equals independent row-by-column reference; blocking improves locality, not Θ(n³) arithmetic',
      {
        A,
        B,
        C,
        reference: ref,
        verified: JSON.stringify(C) === JSON.stringify(ref),
      },
      {
        blockSize: 2,
        blocks: 8,
        scalarProducts: products,
        arithmeticComplexity: 'Theta(n^3)',
      },
      {
        rows: ['C row 1', 'C row 2', 'C row 3', 'C row 4'],
        columns: ['C col 1', 'C col 2', 'C col 3', 'C col 4'],
        values: C,
      },
    )
  } else if (id === 'divide-strassen') {
    const A = v
        ? [
            [2, 0],
            [1, 3],
          ]
        : [
            [1, 2],
            [3, 4],
          ],
      B = v
        ? [
            [4, 1],
            [2, 5],
          ]
        : [
            [5, 6],
            [7, 8],
          ],
      [a, b, c, d] = [A[0]![0]!, A[0]![1]!, A[1]![0]!, A[1]![1]!],
      [e, f, g, h] = [B[0]![0]!, B[0]![1]!, B[1]![0]!, B[1]![1]!]
    const p: number[] = []
    const operandLabels: Record<string, [string, string]> = {
      P1: ['A11', 'B12−B22'],
      P2: ['A11+A12', 'B22'],
      P3: ['A21+A22', 'B11'],
      P4: ['A22', 'B21−B11'],
      P5: ['A11+A22', 'B11+B22'],
      P6: ['A12−A22', 'B21+B22'],
      P7: ['A11−A21', 'B11+B12'],
    }
    const products = [
      ['P1', a, '×', f - h, a * (f - h)],
      ['P2', a + b, '×', h, (a + b) * h],
      ['P3', c + d, '×', e, (c + d) * e],
      ['P4', d, '×', g - e, d * (g - e)],
      ['P5', a + d, '×', e + h, (a + d) * (e + h)],
      ['P6', b - d, '×', g + h, (b - d) * (g + h)],
      ['P7', a - c, '×', e + f, (a - c) * (e + f)],
    ] as const
    for (const [name, left, _op, right, value] of products) {
      p.push(value)
      add(
        'update',
        `${name} = ${left} × ${right} = ${value}`,
        { products: [...p], current: name },
        { scalarProducts: p.length },
        undefined,
        {
          groups: [
            {
              id: `${name}-A-operand`,
              items: [
                {
                  id: `${name}-left`,
                  value: left,
                  label: operandLabels[name]![0],
                },
              ],
            },
            {
              id: `${name}-B-operand`,
              items: [
                {
                  id: `${name}-right`,
                  value: right,
                  label: operandLabels[name]![1],
                },
              ],
            },
          ],
        },
      )
    }
    const C = [
      [p[4]! + p[3]! - p[1]! + p[5]!, p[0]! + p[1]!],
      [p[2]! + p[3]!, p[0]! + p[4]! - p[2]! - p[6]!],
    ]
    add(
      'merge',
      'combine seven products: C11=P5+P4−P2+P6, C12=P1+P2, C21=P3+P4, C22=P1+P5−P3−P7',
      { A, B, products: p, C },
      { scalarProducts: 7 },
      {
        rows: ['C row 1', 'C row 2'],
        columns: ['col 1', 'col 2'],
        values: C,
        active: [0, 0],
      },
    )
    add(
      'done',
      'Strassen result equals the ordinary 2×2 product',
      { A, B, products: p, C },
      { scalarProducts: 7 },
      { rows: ['C row 1', 'C row 2'], columns: ['col 1', 'col 2'], values: C },
    )
  } else if (id === 'divide-fft') {
    const x = v ? [1, 0, 1, 0] : [1, 2, 0, 0],
      e = [x[0]! + x[2]!, x[0]! - x[2]!],
      o = [x[1]! + x[3]!, x[1]! - x[3]!]
    const inputNodes = x.map((value, i) => ({
      id: `x${i}`,
      value: `${value}+0i`,
      label: `x[${i}]`,
      x: 0.08 + (i / (x.length - 1)) * 0.84,
      y: 0.2,
    }))
    add(
      'split',
      'split samples by parity of the index',
      { even: [x[0], x[2]], odd: [x[1], x[3]] },
      { inputSize: 4 },
      undefined,
      {
        nodes: inputNodes,
        groups: [
          {
            id: 'even-inputs',
            items: [0, 2].map((i) => ({
              id: `x${i}`,
              value: x[i]!,
              label: `x[${i}]`,
            })),
          },
          {
            id: 'odd-inputs',
            items: [1, 3].map((i) => ({
              id: `x${i}`,
              value: x[i]!,
              label: `x[${i}]`,
            })),
          },
        ],
      },
    )
    add(
      'update',
      `two-point transforms: E=[${e.join(',')}], O=[${o.join(',')}]`,
      { evenTransform: e, oddTransform: o },
      { evenButterflies: 1, oddButterflies: 1 },
      undefined,
      {
        groups: [
          {
            id: 'even-transform',
            items: e.map((value, i) => ({
              id: `E${i}`,
              value,
              label: `E[${i}]`,
            })),
          },
          {
            id: 'odd-transform',
            items: o.map((value, i) => ({
              id: `O${i}`,
              value,
              label: `O[${i}]`,
            })),
          },
        ],
      },
    )
    const X: [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ] = [
      [e[0]! + o[0]!, 0],
      [e[1]!, -o[1]! || 0],
      [e[0]! - o[0]!, 0],
      [e[1]!, o[1]! || 0],
    ]
    for (let k = 0; k < 4; k++) {
      const evenIndex = k % 2,
        oddIndex = k % 2
      add(
        'update',
        `butterfly k=${k}: E[${evenIndex}] + W₄^${k} O[${oddIndex}] = ${X[k]![0]}${X[k]![1] < 0 ? '' : '+'}${X[k]![1]}i`,
        { k, value: X[k] },
        { butterflies: k + 1 },
        undefined,
        {
          nodes: [
            {
              id: `E${evenIndex}`,
              value: `${e[evenIndex]}+0i`,
              label: `E[${evenIndex}]`,
              x: 0.18,
              y: 0.3,
            },
            {
              id: `O${oddIndex}`,
              value: `${o[oddIndex]}+0i`,
              label: `O[${oddIndex}]`,
              x: 0.82,
              y: 0.3,
            },
            {
              id: `X${k}`,
              value: `${X[k]![0]}+${X[k]![1]}i`,
              label: `X[${k}]`,
              x: 0.5,
              y: 0.72,
              tone: 'active',
            },
          ],
          edges: [
            { from: `E${evenIndex}`, to: `X${k}` },
            { from: `O${oddIndex}`, to: `X${k}`, weight: `W₄^${k}` },
          ],
          groups: [
            {
              id: 'spectrum',
              items: X.slice(0, k + 1).map((z, i) => ({
                id: `X${i}`,
                value: `${z[0]}+${z[1]}i`,
                label: `X[${i}]`,
              })),
            },
          ],
        },
      )
    }
    add(
      'done',
      '4-point complex spectrum computed from radix-2 butterflies',
      X,
      { butterflies: 4 },
      undefined,
      {
        groups: [
          {
            id: 'spectrum',
            items: X.map((z, i) => ({
              id: `X${i}`,
              value: `${z[0]}+${z[1]}i`,
              label: `X[${i}]`,
            })),
          },
        ],
      },
    )
  } else if (id === 'greedy-fractional-knapsack') {
    const xs: [number, number][] = v
        ? [
            [5, 30],
            [10, 50],
            [15, 60],
          ]
        : [
            [10, 60],
            [20, 100],
            [30, 120],
          ],
      cap = v ? 20 : 50
    xs.sort((a, b) => b[1]! / b[0]! - a[1]! / a[0]!)
    let rem = cap,
      value = 0
    const take: {
      weight: number
      value: number
      fraction: number
      ratio: number
    }[] = []
    for (const [w, z] of xs) {
      const ratio = z! / w!,
        fraction = Math.min(1, rem / w!),
        got = fraction * z!
      rem -= fraction * w!
      value += got
      take.push({ weight: w!, value: z!, fraction, ratio })
      add(
        fraction ? 'select' : 'reject',
        `density ${z}/${w}=${ratio}; take fraction ${fraction}, gain ${got}`,
        take.map((x) => ({
          weight: x.weight,
          fraction: x.fraction,
          ratio: x.ratio,
        })),
        { capacity: cap, remaining: rem, totalValue: value },
        undefined,
        {
          groups: [
            {
              id: 'ranked-items',
              items: xs.map(([weight, val], i) => ({
                id: `item-${i}`,
                value: `w=${weight}, v=${val}, ratio=${(val! / weight!).toFixed(2)}`,
                label: `rank ${i + 1}`,
              })),
            },
            {
              id: 'taken',
              items: take.map((x, i) => ({
                id: `item-${i}`,
                value: `${x.fraction} × ${x.value}`,
                label: `fraction ${x.fraction}`,
              })),
            },
          ],
        },
      )
    }
    add(
      'done',
      'take by descending value/weight ratio; fractional final item allowed',
      { take, value },
      { capacity: cap, remaining: rem },
      undefined,
      {
        groups: [
          {
            id: 'chosen-fractions',
            items: take.map((x, i) => ({
              id: `item-${i}`,
              value: `${x.fraction} × ${x.value}`,
              label: `weight ${x.weight}`,
            })),
          },
        ],
      },
    )
  } else if (id === 'greedy-job-deadline') {
    const js: [string, number, number][] = v
      ? [
          ['A', 1, 35],
          ['B', 3, 30],
          ['C', 2, 25],
          ['D', 2, 20],
        ]
      : [
          ['A', 2, 100],
          ['B', 1, 19],
          ['C', 2, 27],
          ['D', 1, 25],
          ['E', 3, 15],
        ]
    js.sort((a, b) => b[2]! - a[2]!)
    const slots = Array(Math.max(...js.map((j) => j[1]!))).fill('')
    let profit = 0
    for (const j of js) {
      let placed = false
      for (let s = Math.min(j[1]!, slots.length) - 1; s >= 0; s--) {
        if (!slots[s]) {
          slots[s] = j[0]
          profit += j[2]!
          placed = true
          add(
            'select',
            `schedule job ${j[0]} (profit ${j[2]}) in latest available slot ${s + 1}`,
            slots,
            {
              job: j[0],
              deadline: j[1]!,
              profit,
              scheduled: slots.filter(Boolean).length,
            },
            undefined,
            {
              groups: [
                {
                  id: 'schedule',
                  items: slots.map((job, i) => ({
                    id: `slot-${i + 1}`,
                    value: job || 'empty',
                    label: `time ${i + 1}`,
                  })),
                },
                {
                  id: 'job-candidates',
                  items: js.map((job) => ({
                    id: `job-${job[0]}`,
                    value: `profit ${job[2]}, deadline ${job[1]}`,
                    tone: job[0] === j[0] ? ('active' as const) : undefined,
                  })),
                },
              ],
            },
          )
          break
        }
      }
      if (!placed)
        add(
          'reject',
          `skip job ${j[0]}: no free slot at or before deadline ${j[1]}`,
          slots,
          {
            job: j[0],
            deadline: j[1]!,
            profit,
            scheduled: slots.filter(Boolean).length,
          },
          undefined,
          {
            groups: [
              {
                id: 'schedule',
                items: slots.map((job, i) => ({
                  id: `slot-${i + 1}`,
                  value: job || 'empty',
                  label: `time ${i + 1}`,
                })),
              },
              {
                id: 'rejected-job',
                items: [
                  {
                    id: `job-${j[0]}`,
                    value: `profit ${j[2]}, deadline ${j[1]}`,
                    tone: 'red',
                  },
                ],
              },
            ],
          },
        )
    }
    add(
      'done',
      'profit-descending schedule preserves earlier slots for tighter deadlines',
      { slots, profit },
      { scheduled: slots.filter(Boolean).length, profit },
      undefined,
      {
        groups: [
          {
            id: 'final-schedule',
            items: slots.map((job, i) => ({
              id: `slot-${i + 1}`,
              value: job || 'empty',
              label: `time ${i + 1}`,
            })),
          },
        ],
      },
    )
  } else if (id === 'greedy-activity-selection') {
    const xs = v
      ? [
          [1, 3],
          [2, 5],
          [4, 7],
          [6, 9],
          [8, 10],
          [9, 12],
        ]
      : [
          [1, 4],
          [3, 5],
          [0, 6],
          [5, 7],
          [3, 9],
          [5, 9],
          [6, 10],
          [8, 11],
          [8, 12],
          [2, 14],
          [12, 16],
        ]
    xs.sort((a, b) => a[1]! - b[1]!)
    const selected: number[][] = []
    let end = -Infinity
    for (const [s, e] of xs) {
      const ok = s! >= end
      if (ok) {
        selected.push([s!, e!])
        end = e!
      }
      add(
        ok ? 'select' : 'reject',
        `activity [${s},${e}): ${ok ? 'starts after' : 'overlaps until'} ${ok ? s : end}`,
        selected,
        {
          start: s!,
          finish: e!,
          nextAvailable: end,
          selected: selected.length,
        },
        undefined,
        {
          groups: [
            {
              id: 'selected-activities',
              items: selected.map((activity, i) => ({
                id: `activity-${i}`,
                value: `${activity[0]}–${activity[1]}`,
                label: `start–finish`,
              })),
            },
            {
              id: 'current-candidate',
              items: [
                {
                  id: `candidate-${s}-${e}`,
                  value: `${s}–${e}`,
                  tone: ok ? ('active' as const) : ('red' as const),
                },
              ],
            },
          ],
        },
      )
    }
    add(
      'done',
      'earliest-finish compatible schedule maximizes activity count',
      selected,
      { selected: selected.length },
      undefined,
      {
        groups: [
          {
            id: 'selected-activities',
            items: selected.map((activity, i) => ({
              id: `activity-${i}`,
              value: `${activity[0]}–${activity[1]}`,
              label: 'start–finish',
            })),
          },
        ],
      },
    )
  } else if (id === 'greedy-johnson-flowshop') {
    const jobs = v
        ? [
            { id: 'A', a: 7, b: 3 },
            { id: 'B', a: 2, b: 8 },
            { id: 'C', a: 6, b: 5 },
            { id: 'D', a: 4, b: 9 },
          ]
        : [
            { id: 'A', a: 3, b: 8 },
            { id: 'B', a: 12, b: 2 },
            { id: 'C', a: 5, b: 6 },
            { id: 'D', a: 4, b: 9 },
          ],
      l: typeof jobs = [],
      r: typeof jobs = []
    jobs.sort((x, y) => Math.min(x.a, x.b) - Math.min(y.a, y.b))
    for (const j of jobs) {
      const m = Math.min(j.a, j.b),
        side = j.a <= j.b ? 'front' : 'back'
      ;(side === 'front' ? l : r).push(j)
      add(
        'select',
        `smallest remaining time ${m} is ${side === 'front' ? 'on M1; append job to front group' : 'on M2; append job to back group'}`,
        {
          orderedCandidates: jobs.map((x) => ({
            job: x.id,
            key: Math.min(x.a, x.b),
          })),
          front: l.map((x) => x.id),
          back: r.map((x) => x.id),
          chosen: j,
        },
        { processingTime: m, side },
        undefined,
        {
          groups: [
            {
              id: 'front-group',
              items: l.map((x) => ({
                id: `job-${x.id}`,
                value: `${x.a}/${x.b}`,
                label: x.id,
              })),
            },
            {
              id: 'back-group',
              items: r.map((x) => ({
                id: `job-${x.id}`,
                value: `${x.a}/${x.b}`,
                label: x.id,
              })),
            },
            {
              id: 'remaining-candidates',
              items: jobs.map((x) => ({
                id: `candidate-${x.id}`,
                value: `M1 ${x.a}, M2 ${x.b}`,
                label: x.id,
              })),
            },
          ],
        },
      )
    }
    const seq = [...l, ...r.reverse()]
    let t1 = 0,
      t2 = 0,
      timesCount = 0
    const times = seq.map((j) => {
      t1 += j.a
      t2 = Math.max(t1, t2) + j.b
      const row = { job: j.id, m1: t1, m2: t2 }
      add(
        'update',
        `job ${j.id}: C1=${t1}; C2=max(C1,C2_prev)+b=${t2}`,
        row,
        { jobs: ++timesCount, makespan: t2 },
        undefined,
        {
          groups: [
            {
              id: 'schedule',
              items: seq.slice(0, timesCount).map((x) => ({
                id: `job-${x.id}`,
                value: x.id,
                label: `${x.a}/${x.b}`,
              })),
            },
            {
              id: 'machine-1-finish',
              items: [{ id: `M1-${j.id}`, value: t1, label: j.id }],
            },
            {
              id: 'machine-2-finish',
              items: [{ id: `M2-${j.id}`, value: t2, label: j.id }],
            },
          ],
        },
      )
      return row
    })
    add(
      'done',
      'Johnson order minimizes makespan for a two-machine permutation flow shop',
      { order: seq.map((j) => j.id), times, makespan: t2 },
      { jobs: seq.length, makespan: t2 },
    )
  } else if (id === 'dp-knapsack-01') {
    const xs = v
        ? [
            [1, 2],
            [3, 5],
            [4, 7],
            [5, 8],
          ]
        : [
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 8],
          ],
      cap = v ? 7 : 8,
      dp = Array.from({ length: 5 }, () => Array(cap + 1).fill(0))
    for (let i = 1; i <= 4; i++)
      for (let c = 0; c <= cap; c++) {
        const [w, z] = xs[i - 1]!,
          skip = dp[i - 1]![c]!,
          take = w! <= c ? dp[i - 1]![c - w!]! + z! : -Infinity
        dp[i]![c] = Math.max(skip, take)
        add(
          'update',
          `item ${i} at capacity ${c}: max(skip ${skip}, take ${take === -Infinity ? 'infeasible' : take}) = ${dp[i]![c]}`,
          { items: xs, capacity: cap },
          { item: i, capacity: c, value: dp[i]![c], states: i * (cap + 1) + c },
          {
            rows: dp.map((_, r) => `items ≤ ${r}`),
            columns: Array.from({ length: cap + 1 }, (_, x) => String(x)),
            values: dp.map((row) => [...row]),
            active: [i, c],
          },
        )
      }
    let c = cap,
      chosen: number[] = []
    for (let i = xs.length; i > 0; i--) {
      if (dp[i]![c] !== dp[i - 1]![c]) {
        chosen.push(i - 1)
        c -= xs[i - 1]![0]!
        add(
          'select',
          `item ${i} selected; remaining capacity=${c}`,
          { chosen: [...chosen].reverse().map((k) => k + 1) },
          { item: i, remainingCapacity: c },
        )
      } else
        add(
          'reject',
          `item ${i} skipped; value unchanged at capacity ${c}`,
          { chosen: [...chosen].reverse().map((k) => k + 1) },
          { item: i, remainingCapacity: c },
        )
    }
    chosen.reverse()
    add(
      'done',
      'backtrack complete: selected items and optimal capacity value',
      {
        items: chosen.map((i) => ({
          id: i + 1,
          weight: xs[i]![0],
          value: xs[i]![1],
        })),
        capacity: cap,
        value: dp[4]![cap],
        table: dp,
      },
      { states: 5 * (cap + 1) },
      undefined,
      {
        groups: [
          {
            id: 'chosen-items',
            items: chosen.map((i) => ({
              id: `item-${i + 1}`,
              value: `w=${xs[i]![0]},v=${xs[i]![1]}`,
              label: `item ${i + 1}`,
            })),
          },
        ],
      },
    )
  } else if (id === 'dp-matrix-chain') {
    const p = v ? [5, 10, 3, 12, 5] : [10, 30, 5, 60],
      n = p.length - 1,
      m = Array.from({ length: n }, () => Array(n).fill(0)),
      s = Array.from({ length: n }, () => Array(n).fill(0))
    for (let len = 2; len <= n; len++)
      for (let i = 0; i <= n - len; i++) {
        const j = i + len - 1
        m[i]![j] = Infinity
        for (let k = i; k < j; k++) {
          const z = m[i]![k]! + m[k + 1]![j]! + p[i]! * p[k + 1]! * p[j + 1]!,
            improves = z < m[i]![j]!
          if (improves) {
            m[i]![j] = z
            s[i]![j] = k + 1
          }
          add(
            improves ? 'update' : 'compare',
            `split k=${k + 1}: ${m[i]![k]} + ${m[k + 1]![j]} + ${p[i]}×${p[k + 1]}×${p[j + 1]} = ${z}${improves ? ' (best so far)' : ''}`,
            { costs: m, splits: s },
            { i: i + 1, j: j + 1, k: k + 1, candidate: z, best: m[i]![j] },
            {
              rows: Array.from({ length: n }, (_, r) => `A${r + 1}..`),
              columns: Array.from({ length: n }, (_, c) => `..A${c + 1}`),
              values: m.map((row) => [...row]),
              active: [i, j],
            },
          )
        }
      }
    const paren = (i: number, j: number): string =>
      i === j
        ? `A${i + 1}`
        : `(${paren(i, s[i]![j]! - 1)}×${paren(s[i]![j]!, j)})`
    const order = paren(0, n - 1)
    add(
      'select',
      `follow stored split choices: ${order}`,
      { parenthesization: order },
      { minimumMultiplications: m[0]![n - 1] },
      undefined,
      {
        groups: [
          {
            id: 'parenthesization',
            items: [
              {
                id: 'optimal-order',
                value: order,
                label: 'optimal multiplication order',
              },
            ],
          },
        ],
      },
    )
    add(
      'done',
      'optimal parenthesization and cost recovered from split table',
      {
        dimensions: p,
        parenthesization: order,
        minMultiplications: m[0]![n - 1],
        splits: s,
        table: m,
      },
      { states: (n * (n + 1)) / 2 },
    )
  } else if (id === 'dp-optimal-bst') {
    const keys = ['A', 'B', 'C', 'D'],
      p = v ? [0.2, 0.08, 0.28, 0.24] : [0.08, 0.16, 0.32, 0.24],
      q = [0.04, 0.04, 0.04, 0.04, 0.04],
      n = 4,
      e = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0)),
      w = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0)),
      root = Array.from({ length: n + 1 }, () => Array(n + 1).fill(-1))
    for (let i = 0; i <= n; i++) e[i]![i] = w[i]![i] = q[i]!
    add(
      'start',
      `probability mass: Σp=${p.reduce((a, b) => a + b, 0)}, Σq=${q.reduce((a, b) => a + b, 0)}`,
      { keys, p, q },
      {
        probabilityTotal:
          p.reduce((a, b) => a + b, 0) + q.reduce((a, b) => a + b, 0),
      },
    )
    for (let len = 1; len <= n; len++)
      for (let i = 0; i <= n - len; i++) {
        const j = i + len
        w[i]![j] = w[i]![j - 1]! + p[j - 1]! + q[j]!
        e[i]![j] = Infinity
        for (let r = i; r < j; r++) {
          const z = e[i]![r]! + e[r + 1]![j]! + w[i]![j]!,
            improves = z < e[i]![j]!
          if (improves) {
            e[i]![j] = z
            root[i]![j] = r
          }
          add(
            improves ? 'update' : 'compare',
            `interval ${i + 1}..${j}: root ${keys[r]} gives ${z}; current best=${e[i]![j]}`,
            { expectedCosts: e, rootChoices: root },
            { i: i + 1, j, root: keys[r], candidate: z, best: e[i]![j] },
            {
              rows: Array.from({ length: n + 1 }, (_, r) => `i=${r}`),
              columns: Array.from({ length: n + 1 }, (_, c) => `j=${c}`),
              values: e.map((row) => [...row]),
              active: [i, j],
            },
          )
        }
      }
    add(
      'done',
      'E[i,j]=minᵣ(E[i,r]+E[r+1,j]+W[i,j]); p=successful and q=unsuccessful probabilities, total mass=1',
      { keys, p, q, expectedCost: e[0]![n], root },
      {
        states: (n * (n + 1)) / 2,
        probabilityTotal:
          p.reduce((a, b) => a + b, 0) + q.reduce((a, b) => a + b, 0),
      },
    )
  } else if (id === 'dp-lcs') {
    const x = v ? 'XMJYAUZ' : 'ABCBDAB',
      y = v ? 'MZJAWXU' : 'BDCABA',
      d = Array.from({ length: x.length + 1 }, () =>
        Array(y.length + 1).fill(0),
      )
    for (let i = 1; i <= x.length; i++)
      for (let j = 1; j <= y.length; j++) {
        const match = x[i - 1] === y[j - 1]
        d[i]![j] = match
          ? d[i - 1]![j - 1]! + 1
          : Math.max(d[i - 1]![j]!, d[i]![j - 1]!)
        add(
          'update',
          `(${x[i - 1]},${y[j - 1]}): ${match ? 'match, diagonal + 1' : 'mismatch, max(top,left)'} = ${d[i]![j]}`,
          { x, y, length: d[i]![j] },
          { i, j, states: i * y.length + j },
          {
            rows: ['∅', ...x.split('')],
            columns: ['∅', ...y.split('')],
            values: d.map((row) => [...row]),
            active: [i, j],
          },
        )
      }
    let i = x.length,
      j = y.length,
      z = ''
    while (i && j) {
      if (x[i - 1] === y[j - 1]) {
        z = x[i - 1] + z
        add(
          'select',
          `match ${x[i - 1]} at (${i},${j}); move diagonally`,
          { lcs: z },
          { i, j, length: z.length },
          undefined,
          {
            groups: [
              {
                id: 'sequence-x',
                items: x.split('').map((ch, k) => ({
                  id: `x${k}`,
                  value: ch,
                  label: `x[${k + 1}]`,
                  tone: k === i - 1 ? ('active' as const) : undefined,
                })),
              },
              {
                id: 'sequence-y',
                items: y.split('').map((ch, k) => ({
                  id: `y${k}`,
                  value: ch,
                  label: `y[${k + 1}]`,
                  tone: k === j - 1 ? ('active' as const) : undefined,
                })),
              },
              {
                id: 'lcs-prefix',
                items: z.split('').map((ch, k) => ({
                  id: `lcs${k}`,
                  value: ch,
                  label: `LCS[${k + 1}]`,
                })),
              },
            ],
          },
        )
        i--
        j--
      } else if (d[i - 1]![j]! >= d[i]![j - 1]!) {
        add(
          'reject',
          `top ${d[i - 1]![j]} >= left ${d[i]![j - 1]}; move up`,
          { lcs: z },
          { i, j },
        )
        i--
      } else {
        add(
          'reject',
          `left ${d[i]![j - 1]} > top ${d[i - 1]![j]}; move left`,
          { lcs: z },
          { i, j },
        )
        j--
      }
    }
    add(
      'done',
      'backtrack the table to recover one longest common subsequence',
      { x, y, lcs: z, length: z.length, table: d },
      { states: x.length * y.length },
    )
  } else {
    const jobs = v
        ? [
            [2, 4],
            [3, 2],
            [1, 3],
            [4, 1],
          ]
        : [
            [3, 5],
            [2, 1],
            [4, 3],
            [1, 4],
          ],
      n = 4,
      dp = Array(1 << n).fill(Infinity),
      prev = Array(1 << n).fill(-1)
    dp[0] = 0
    for (let mask = 0; mask < 1 << n; mask++) {
      let t1 = 0
      for (let k = 0; k < n; k++) if ((mask >> k) & 1) t1 += jobs[k]![0]!
      for (let j = 0; j < n; j++)
        if (!((mask >> j) & 1)) {
          const nm = mask | (1 << j),
            t = Math.max(t1 + jobs[j]![0]!, dp[mask]!) + jobs[j]![1]!,
            improves = t < dp[nm]!
          if (improves) {
            dp[nm] = t
            prev[nm] = j
          }
          add(
            improves ? 'update' : 'compare',
            `subset ${mask.toString(2).padStart(n, '0')} append J${j + 1}: C1=${t1 + jobs[j]![0]!}, C2 candidate=${t}; best=${dp[nm]}`,
            { subset: nm.toString(2).padStart(n, '0'), cost: dp[nm] },
            {
              states: mask,
              jobs: n,
              lastJob: j + 1,
              candidate: t,
              best: dp[nm],
            },
            undefined,
            {
              items: dp.map((cost, state) => ({
                id: `subset-${state.toString(2).padStart(n, '0')}`,
                value: Number.isFinite(cost) ? cost : '∞',
                label: `S=${state.toString(2).padStart(n, '0')}`,
              })),
            },
          )
        }
    }
    let mask = (1 << n) - 1,
      order: number[] = []
    while (mask) {
      const j = prev[mask]!
      order.push(j + 1)
      mask ^= 1 << j
      add(
        'select',
        `backtrack last job J${j + 1}`,
        { remainingMask: mask, reverseOrder: [...order] },
        { remainingJobs: mask },
        undefined,
        {
          groups: [
            {
              id: 'recovered-order',
              items: order.map((job, i) => ({
                id: `job-${job}`,
                value: `J${job}`,
                label: `position ${i + 1}`,
              })),
            },
          ],
        },
      )
    }
    order.reverse()
    add(
      'done',
      'Exact subset DP: C₂[S]=minⱼ(max(C₁[S−j]+aⱼ,C₂[S−j])+bⱼ)',
      { jobs, makespan: dp[(1 << n) - 1], order },
      { states: 1 << n, jobs: n },
    )
  }
  if (f.at(-1)?.op !== 'done') {
    const last = structuredClone(f.at(-1)!)
    last.op = 'done'
    last.output = terminalOutput(id, last.result)
    record(f, last)
  }
  return f
}
export const algorithmsMissions: CourseMission[] = defs.map(
  ([id, chapter]) => ({
    id,
    chapter,
    sources: [
      ...(id.startsWith('dp-')
        ? (['combined', 'design', 'advanced'] as const)
        : id.startsWith('greedy-')
          ? (['combined', 'design'] as const)
          : (['combined', 'structures', 'design', 'advanced'] as const)),
      ...([
        'divide-recursion-tree',
        'divide-closest-pair',
        'divide-comparison-lower-bound',
        'divide-quickselect',
        'dp-knapsack-01',
        'dp-matrix-chain',
        'dp-lcs',
        'greedy-activity-selection',
        'greedy-fractional-knapsack',
      ].includes(id)
        ? (['ai'] as const)
        : []),
    ],
    trace: (v: 0 | 1) => sim(id, v),
  }),
)
