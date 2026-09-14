import {
  AlignEndHorizontal, ArrowUpDown, BadgeCheck, Boxes, ChartColumn, Combine, Crosshair, Dices, Gauge, Grid3x3, Hash,
  ListOrdered, ListTree, MousePointerClick, Scale, ScanSearch, Shuffle, Split, Target, TrendingUp, UserCheck, Waypoints,
  type LucideIcon,
} from 'lucide-react'

/** 每个算法的视觉身份：同一个 logo 贯穿学院列表与侧边导航。 */
const lessonLogos: Record<string, LucideIcon> = {
  'algorithm-role': BadgeCheck,
  'asymptotic-notation': TrendingUp,
  'binary-search': ScanSearch,
  'bucket-sort': Boxes,
  'counting-sort': Hash,
  'divide-conquer': Crosshair,
  'heap-sort': Waypoints,
  'hiring-problem': UserCheck,
  'insertion-sort': MousePointerClick,
  'master-method': Scale,
  'maximum-subarray': ChartColumn,
  'median-of-medians': Target,
  'merge-sort': Combine,
  'order-statistics': Target,
  'priority-queue': ArrowUpDown,
  'quick-sort': Split,
  'radix-sort': ListOrdered,
  'randomized-algorithms': Dices,
  'randomized-quicksort': Shuffle,
  'recurrence-equations': ListTree,
  'strassen': Grid3x3,
}

export function LessonIcon({ id, size = 15 }: { id: string; size?: number }) {
  const Logo = lessonLogos[id] ?? AlignEndHorizontal
  return <Logo size={size} aria-hidden="true" />
}
