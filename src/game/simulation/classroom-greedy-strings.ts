import type { CourseMission, TraceFrame, TraceItem } from '../types'
import { record } from './trace'

const emit = (frames: TraceFrame[], op: TraceFrame['op'], formula: string,
  counters: TraceFrame['counters'], extra: Partial<TraceFrame> = {}) =>
  record(frames, { op, formula, counters, ...extra })
const tiles = (values: readonly (string | number)[], active = -1, prefix = 'x'): TraceItem[] =>
  values.map((value, i) => ({ id: `${prefix}${i}`, value, label: String(i), tone: i === active ? 'active' : undefined }))

/** Ordered houses; the final site is pulled back to the last house as on slide 6. */
export function postOffices(houses: readonly number[], radius: number): number[] {
  if (radius < 0 || !Number.isFinite(radius) || houses.some((x, i) => !Number.isFinite(x) || (i > 0 && x <= houses[i - 1])))
    throw new Error('houses must be strictly ordered and radius nonnegative')
  const offices: number[] = []
  for (const house of houses) if (!offices.length || house > offices.at(-1)! + radius) offices.push(house + radius)
  if (offices.length && offices.at(-1)! > houses.at(-1)!) offices[offices.length - 1] = houses.at(-1)!
  return offices
}

const postInputs = [
  { houses: [20, 70, 175, 225, 430, 470], radius: 100 },
  { houses: [10, 205, 211, 410, 612], radius: 100 },
] as const
function tracePost(variant: 0 | 1): TraceFrame[] {
  const { houses, radius } = postInputs[variant]
  const frames: TraceFrame[] = [], offices: number[] = []
  const seen = () => ({ items: tiles(houses), output: tiles(offices, offices.length - 1, 'office') })
  emit(frames, 'start', `R=${radius}; H_0=${houses[0]}`, { radius, houses: houses.length, offices: 0 }, seen())
  for (let i = 0; i < houses.length; i++) {
    const h = houses[i]
    if (!offices.length || h > offices.at(-1)! + radius) {
      offices.push(h + radius)
      emit(frames, 'select', `P_${offices.length}=H_${i}+R=${h}+${radius}=${h + radius}; covered through ${h + 2 * radius}`,
        { houseIndex: i, house: h, radius, office: h + radius, coveredThrough: h + 2 * radius, count: offices.length },
        { ...seen(), items: tiles(houses, i) })
    } else emit(frames, 'visit', `H_${i}=${h} <= P_${offices.length}+R=${offices.at(-1)! + radius}`,
      { houseIndex: i, house: h, coveredThrough: offices.at(-1)! + radius, count: offices.length },
      { ...seen(), items: tiles(houses, i) })
  }
  if (offices.at(-1)! > houses.at(-1)!) {
    const before = offices.at(-1)!
    offices[offices.length - 1] = houses.at(-1)!
    emit(frames, 'update', `last office ${before} -> H_last=${houses.at(-1)}`,
      { before, after: houses.at(-1)!, count: offices.length }, seen())
  }
  emit(frames, 'done', `m=${offices.length}; |H_i-P_{nearest}| <= ${radius}`,
    { count: offices.length, radius }, { ...seen(), result: [...offices] })
  return frames
}

export type FuelPlan = { stops: number[]; purchases: number[]; cost: number; remainingAt: number[] }
/** Prices are cost per kilometre of range; positions include start and destination. */
export function minCostRefuel(positions: readonly number[], prices: readonly number[], capacity: number): FuelPlan | null {
  const n = positions.length
  if (n < 2 || prices.length !== n || !Number.isInteger(capacity) || capacity <= 0 ||
    positions.some((x, i) => !Number.isInteger(x) || (i > 0 && x <= positions[i - 1])) ||
    prices.some((p) => !Number.isFinite(p) || p < 0)) throw new Error('invalid fuel inputs')
  if (positions.some((x, i) => i > 0 && x - positions[i - 1] > capacity)) return null
  const stops: number[] = [], purchases = Array(n).fill(0) as number[], remainingAt = Array(n).fill(-1) as number[]
  let at = 0, remaining = 0, cost = 0
  remainingAt[0] = 0
  while (at < n - 1) {
    let next = -1
    for (let j = at + 1; j < n && positions[j] - positions[at] <= capacity; j++) {
      if (prices[j] < prices[at] || j === n - 1) { next = j; break }
    }
    let target: number
    if (next >= 0) target = positions[next] - positions[at]
    else {
      for (let j = at + 1; j < n && positions[j] - positions[at] <= capacity; j++)
        if (next < 0 || prices[j] <= prices[next]) next = j // farthest on a tie
      target = capacity
    }
    if (next < 0) return null
    const buy = Math.max(0, target - remaining)
    purchases[at] = buy
    if (buy) stops.push(at)
    cost += buy * prices[at]
    remaining = remaining + buy - (positions[next] - positions[at])
    at = next
    remainingAt[at] = remaining
  }
  return { stops, purchases, cost, remainingAt }
}

const fuelInputs = [
  { positions: [0, 4, 7, 12, 14, 17, 18], prices: [5, 6, 2, 4, 3, 7, 0], capacity: 8 },
  { positions: [0, 3, 7, 10, 14, 18], prices: [4, 6, 5, 5, 7, 0], capacity: 8 },
] as const
function traceFuel(variant: 0 | 1): TraceFrame[] {
  const { positions, prices, capacity } = fuelInputs[variant]
  const answer = minCostRefuel(positions, prices, capacity)!
  const frames: TraceFrame[] = []
  const stationItems = (active = -1) => positions.map((position, i) => ({
    id: `station${i}`, value: position, label: `P=${prices[i]}`, tone: i === active ? 'active' as const : undefined,
  }))
  emit(frames, 'start', `L=${capacity}; R_0=0; P_B=0`, { capacity, station: 0, remaining: 0, cost: 0 }, { items: stationItems() })
  let running = 0, previous = 0
  for (let i = 0; i < positions.length - 1; i++) {
    if (answer.remainingAt[i] < 0) continue
    const next = answer.remainingAt.findIndex((v, j) => j > i && v >= 0)
    if (next < 0) break
    const incoming = i === 0 ? 0 : answer.remainingAt[i]
    const buy = answer.purchases[i]
    const firstCheaper = prices[next] < prices[i]
    running += buy * prices[i]
    emit(frames, 'select', firstCheaper
      ? `P_${next}<P_${i}; G_${i}=(${positions[next]}-${positions[i]})-${incoming}=${buy}`
      : `P_j>=P_${i}; G_${i}=L-R_${i}=${capacity}-${incoming}=${buy}; next=${next}`,
    { station: i, next, price: prices[i], remaining: incoming, buy, leg: positions[next] - positions[i], cost: running, case: firstCheaper ? 1 : 2 },
    { items: stationItems(i), output: tiles(answer.purchases.slice(0, i + 1), i, 'purchase') })
    emit(frames, 'visit', `R_${next}=R_${i}+G_${i}-(${positions[next]}-${positions[i]})=${answer.remainingAt[next]}`,
      { station: next, previous: i, remaining: answer.remainingAt[next], cost: running }, { items: stationItems(next) })
    previous = next
    i = next - 1
  }
  emit(frames, 'done', `cost=sum(G_i P_i)=${answer.cost}; R_B=${answer.remainingAt.at(-1)}`,
    { cost: answer.cost, stops: answer.stops.length, destination: previous, remaining: answer.remainingAt.at(-1)! },
    { items: stationItems(), output: tiles(answer.purchases, -1, 'purchase'), result: answer })
  return frames
}

const alphabet = (pattern: string, text: string) => [...new Set([...pattern, ...text])].sort()
const code = (char: string) => char.codePointAt(0)!
export function rabinKarpAll(text: string, pattern: string, base = 31, modulus = 101): { matches: number[]; collisions: number[] } {
  if (!pattern || !Number.isSafeInteger(base) || base < 2 || !Number.isSafeInteger(modulus) || modulus < 2) throw new Error('invalid hash inputs')
  const matches: number[] = [], collisions: number[] = []
  if (pattern.length > text.length) return { matches, collisions }
  let power = 1, p = 0, h = 0
  for (let i = 0; i < pattern.length; i++) {
    if (i) power = (power * base) % modulus
    p = (p * base + code(pattern[i])) % modulus
    h = (h * base + code(text[i])) % modulus
  }
  for (let s = 0; s <= text.length - pattern.length; s++) {
    if (p === h) (text.slice(s, s + pattern.length) === pattern ? matches : collisions).push(s)
    if (s < text.length - pattern.length)
      h = ((base * (h - code(text[s]) * power) + code(text[s + pattern.length])) % modulus + modulus) % modulus
  }
  return { matches, collisions }
}

const stringInputs = [
  { text: 'abababa', pattern: 'aba' },
  { text: 'abcabcaabca', pattern: 'abca' },
] as const
function traceRk(variant: 0 | 1): TraceFrame[] {
  const { text, pattern } = stringInputs[variant]
  const base = 31, modulus = 7, frames: TraceFrame[] = []
  const answer = rabinKarpAll(text, pattern, base, modulus)
  const hash = (s: string) => [...s].reduce((h, c) => (h * base + code(c)) % modulus, 0)
  let power = 1
  for (let i = 1; i < pattern.length; i++) power = power * base % modulus
  const patternHash = hash(pattern)
  let h = hash(text.slice(0, pattern.length))
  emit(frames, 'start', `d=${base}; q=${modulus}; h=d^(m-1) mod q=${power}; p=${patternHash}`,
    { base, modulus, power, patternHash, windowHash: h }, { items: tiles([...text], -1, 't'), groups: [{ id: 'pattern', items: tiles([...pattern], -1, 'p') }] })
  for (let s = 0; s <= text.length - pattern.length; s++) {
    const equalHash = h === patternHash, equalText = text.slice(s, s + pattern.length) === pattern
    emit(frames, equalHash ? equalText ? 'select' : 'reject' : 'compare',
      `s=${s}; t_s=${h}; p=${patternHash}; ${equalHash ? `verify T[${s}..${s + pattern.length - 1}]` : 'hashes differ'}`,
      { shift: s, windowHash: h, patternHash, hashHit: Number(equalHash), verified: Number(equalText), collisions: answer.collisions.filter(x => x <= s).length },
      { items: tiles([...text], s, 't'), groups: [{ id: 'window', items: tiles([...text.slice(s, s + pattern.length)], -1, `w${s}-`) }, { id: 'pattern', items: tiles([...pattern], -1, 'p') }] })
    if (s < text.length - pattern.length) {
      const old = h
      h = ((base * (h - code(text[s]) * power) + code(text[s + pattern.length])) % modulus + modulus) % modulus
      emit(frames, 'update', `t_${s + 1}=(d(t_${s}-h*${code(text[s])})+${code(text[s + pattern.length])}) mod q=${h}`,
        { shift: s + 1, oldHash: old, dropped: code(text[s]), added: code(text[s + pattern.length]), windowHash: h },
        { items: tiles([...text], s + 1, 't') })
    }
  }
  emit(frames, 'done', `valid shifts={${answer.matches.join(',')}}; pseudo hits={${answer.collisions.join(',')}}`,
    { matches: answer.matches.length, collisions: answer.collisions.length },
    { items: tiles([...text], -1, 't'), output: tiles(answer.matches, -1, 'match'), result: answer })
  return frames
}

/** delta(q,a) is the longest pattern prefix that is a suffix of P[0:q]+a. */
export function buildAutomaton(pattern: string, symbols: readonly string[]): number[][] {
  if (!pattern) throw new Error('empty pattern')
  return Array.from({ length: pattern.length + 1 }, (_, q) => symbols.map((a) => {
    const word = pattern.slice(0, q) + a
    for (let k = Math.min(pattern.length, word.length); k >= 0; k--)
      if (word.endsWith(pattern.slice(0, k))) return k
    return 0
  }))
}
export function automatonAll(text: string, pattern: string): number[] {
  const symbols = alphabet(pattern, text), table = buildAutomaton(pattern, symbols)
  const matches: number[] = []
  let q = 0
  for (let i = 0; i < text.length; i++) {
    q = table[q][symbols.indexOf(text[i])]
    if (q === pattern.length) matches.push(i - pattern.length + 1)
  }
  return matches
}
function traceAutomaton(variant: 0 | 1): TraceFrame[] {
  const { text, pattern } = stringInputs[variant]
  const symbols = alphabet(pattern, text), table = buildAutomaton(pattern, symbols), frames: TraceFrame[] = []
  const matrix = (q?: number, c?: string) => ({ rows: table.map((_, i) => String(i)), columns: symbols,
    values: table, active: q === undefined || c === undefined ? undefined : [q, symbols.indexOf(c)] as [number, number] })
  const matches: number[] = []
  emit(frames, 'start', `Q={0,...,${pattern.length}}; accept=${pattern.length}; delta(q,a)=sigma(P_q a)`,
    { states: pattern.length + 1, alphabet: symbols.length, state: 0 },
    { items: tiles([...text], -1, 't'), matrix: matrix() })
  for (let q = 0; q <= pattern.length; q++) for (const c of symbols)
    emit(frames, 'update', `delta(${q},${c})=sigma(${pattern.slice(0, q) + c})=${table[q][symbols.indexOf(c)]}`,
      { state: q, symbol: c, next: table[q][symbols.indexOf(c)] }, { matrix: matrix(q, c), groups: [{ id: 'candidate suffix', items: tiles([...pattern.slice(0, table[q][symbols.indexOf(c)])], -1, 'p') }] })
  let q = 0
  for (let i = 0; i < text.length; i++) {
    const before = q
    q = table[q][symbols.indexOf(text[i])]
    if (q === pattern.length) matches.push(i - pattern.length + 1)
    emit(frames, q === pattern.length ? 'select' : 'visit', `q_${i + 1}=delta(${before},${text[i]})=${q}`,
      { textIndex: i, before, state: q, matches: matches.length },
      { items: tiles([...text], i, 't'), matrix: matrix(before, text[i]), output: tiles(matches, -1, 'match') })
  }
  emit(frames, 'done', `valid shifts={${matches.join(',')}}`, { matches: matches.length, state: q },
    { items: tiles([...text], -1, 't'), matrix: matrix(), output: tiles(matches, -1, 'match'), result: matches })
  return frames
}

export function prefixFunction(pattern: string): number[] {
  const pi = Array(pattern.length).fill(0) as number[]
  for (let i = 1; i < pattern.length; i++) {
    let k = pi[i - 1]
    while (k > 0 && pattern[i] !== pattern[k]) k = pi[k - 1]
    if (pattern[i] === pattern[k]) k++
    pi[i] = k
  }
  return pi
}
export function kmpAll(text: string, pattern: string): number[] {
  if (!pattern) throw new Error('empty pattern')
  const pi = prefixFunction(pattern), matches: number[] = []
  let q = 0
  for (let i = 0; i < text.length; i++) {
    while (q > 0 && pattern[q] !== text[i]) q = pi[q - 1]
    if (pattern[q] === text[i]) q++
    if (q === pattern.length) { matches.push(i - pattern.length + 1); q = pi[q - 1] }
  }
  return matches
}
function traceKmp(variant: 0 | 1): TraceFrame[] {
  const { text, pattern } = stringInputs[variant]
  const pi = prefixFunction(pattern), frames: TraceFrame[] = [], matches: number[] = []
  const visible = (i = -1, q = 0) => ({ items: tiles([...text], i, 't'), groups: [
    { id: 'pattern', items: tiles([...pattern], q, 'p') }, { id: 'pi', items: tiles(pi, q, 'pi') }], output: tiles(matches, -1, 'match') })
  emit(frames, 'start', `m=${pattern.length}; q=0`, { length: pattern.length, state: 0 }, visible())
  for (let i = 1; i < pi.length; i++)
    emit(frames, 'update', `pi[${i}]=${pi[i]}; longest proper prefix=suffix of P[0..${i}]`,
      { patternIndex: i, prefix: pi[i] }, visible(-1, i))
  let q = 0
  for (let i = 0; i < text.length; i++) {
    while (q > 0 && pattern[q] !== text[i]) {
      const before = q
      q = pi[q - 1]
      emit(frames, 'reject', `P[${before}]!=T[${i}]; q=pi[${before - 1}]=${q}`,
        { textIndex: i, before, state: q, fallback: pi[before - 1] }, visible(i, q))
    }
    if (pattern[q] === text[i]) q++
    emit(frames, 'compare', `T[${i}]=${text[i]}; q=${q}`,
      { textIndex: i, state: q }, visible(i, Math.min(q, pattern.length - 1)))
    if (q === pattern.length) {
      const shift = i - pattern.length + 1
      matches.push(shift)
      const before = q
      q = pi[q - 1]
      emit(frames, 'select', `match shift=${shift}; q=pi[${before - 1}]=${q}`,
        { textIndex: i, shift, matches: matches.length, state: q }, visible(i, q))
    }
  }
  emit(frames, 'done', `valid shifts={${matches.join(',')}}`, { matches: matches.length, state: q },
    { ...visible(), result: matches })
  return frames
}

export const classroomGreedyStringsMissions: CourseMission[] = [
  { id: 'ppt-greedy-post-office', chapter: 'greedy', sources: ['classroom'], trace: tracePost },
  { id: 'ppt-greedy-refuel', chapter: 'greedy', sources: ['classroom'], trace: traceFuel },
  { id: 'ppt-string-rabin-karp', chapter: 'strings', sources: ['classroom'], trace: traceRk },
  { id: 'ppt-string-automaton', chapter: 'strings', sources: ['classroom'], trace: traceAutomaton },
  { id: 'ppt-string-kmp-all', chapter: 'strings', sources: ['classroom'], trace: traceKmp },
]
