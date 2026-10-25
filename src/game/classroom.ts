/** Physical page references to the private classroom source files. No PPT content is bundled. */
export const classroomSources = [
  { id: 'c01', file: '第 1 章-PPT-N2_v4.pptx', pages: 66, kind: 'slides' },
  { id: 'c02', file: '第 2章-PPT-N2.pptx', pages: 34, kind: 'slides' },
  { id: 'c03', file: '第 3章-PPT-N2_v3.pptx', pages: 39, kind: 'slides' },
  { id: 'c04', file: '第 4章-PPT-N2_modified.pptx', pages: 34, kind: 'slides' },
  { id: 'c05', file: '第 5章-PPT-N2.pptx', pages: 20, kind: 'slides' },
  { id: 'c06', file: '第 6章-PPT-N2_v2.pptx', pages: 81, kind: 'slides' },
  { id: 'c07', file: '第 7章-PPT-N2.pptx', pages: 60, kind: 'slides' },
  { id: 'c08', file: '第 8章-PPT-N2.pptx', pages: 61, kind: 'slides' },
  { id: 'c09', file: '第 9章-PPT-N2.pptx', pages: 29, kind: 'slides' },
  { id: 'c10', file: '第 10章-PPT-N2.pptx', pages: 34, kind: 'slides' },
  { id: 'c11', file: '第 11章-PPT-N2 v3.1.pptx', pages: 53, kind: 'slides' },
  { id: 'c13', file: '第 13章-PPT-N2.ppt', pages: 39, kind: 'slides' },
  { id: 'c14', file: '第 14章-PPT-N2.pptx', pages: 57, kind: 'slides' },
  { id: 'c15', file: '第 15章-PPT-N2.pptx', pages: 22, kind: 'slides' },
  { id: 'c16', file: '第 16章-PPT-N2_short.pptx', pages: 26, kind: 'slides' },
  { id: 'homework', file: '作业讲解 2025.pptx', pages: 16, kind: 'slides' },
  { id: 'exam', file: '试题_20221120.docx', pages: 2, kind: 'doc' },
  { id: 'outline', file: '课程要点.docx', pages: 1, kind: 'doc' },
] as const

export type ClassroomSourceId = (typeof classroomSources)[number]['id']
export type ClassroomMissionReference = {
  id: string
  pages: number[]
  emphasis: 'core' | 'extension'
}
export type ClassroomUnit = {
  id: Exclude<ClassroomSourceId, 'outline'>
  number: number | null
  sourceId: ClassroomSourceId
  missions: ClassroomMissionReference[]
}

/** A reference maps an exact classroom topic to a task; it is not a correctness or mastery claim. */
export const classroomUnits: ClassroomUnit[] = [
  { id: 'c01', number: 1, sourceId: 'c01', missions: [
    { id: 'foundation-modeling', pages: [9, 10, 11], emphasis: 'core' },
    { id: 'foundation-correctness', pages: [9, 10], emphasis: 'core' },
    { id: 'foundation-asymptotics', pages: [20, 21, 22, 23, 24, 28], emphasis: 'core' },
    { id: 'structure-complexity-counting', pages: [13, 14, 15, 18, 20], emphasis: 'core' },
    { id: 'structure-sequence', pages: [56, 57], emphasis: 'extension' },
    { id: 'structure-lists', pages: [57], emphasis: 'extension' },
    { id: 'structure-stack-recursion', pages: [58], emphasis: 'extension' },
    { id: 'structure-queues', pages: [60], emphasis: 'extension' },
    { id: 'tree-properties', pages: [62, 63], emphasis: 'extension' },
  ] },
  { id: 'c02', number: 2, sourceId: 'c02', missions: [
    { id: 'structure-searches', pages: [4], emphasis: 'core' },
    { id: 'divide-recursion-tree', pages: [5, 9, 10], emphasis: 'core' },
    { id: 'divide-master-theorem', pages: [11, 12, 13, 14, 15, 16], emphasis: 'core' },
    { id: 'ppt-divide-max-subarray', pages: [17, 18, 19, 20, 21], emphasis: 'core' },
    { id: 'divide-closest-pair', pages: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32], emphasis: 'core' },
    { id: 'ppt-divide-market', pages: [34], emphasis: 'extension' },
  ] },
  { id: 'c03', number: 3, sourceId: 'c03', missions: [
    { id: 'sort-insertion-direct', pages: [2, 3, 4, 5, 6, 7], emphasis: 'core' },
    { id: 'sort-heap', pages: [8, 9, 10, 12, 13, 14, 15, 16], emphasis: 'core' },
    { id: 'tree-heap', pages: [17, 18], emphasis: 'extension' },
    { id: 'sort-merge', pages: [19, 20, 21, 22, 23, 24, 25], emphasis: 'core' },
    { id: 'sort-quick', pages: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37], emphasis: 'core' },
    { id: 'ppt-merge-kway', pages: [39], emphasis: 'core' },
  ] },
  { id: 'c04', number: 4, sourceId: 'c04', missions: [
    { id: 'divide-comparison-lower-bound', pages: [3, 4, 5], emphasis: 'core' },
    { id: 'sort-counting', pages: [12, 13, 14, 15, 16, 17, 18, 20, 21], emphasis: 'core' },
    { id: 'sort-radix', pages: [22, 23, 24, 25, 26], emphasis: 'core' },
    { id: 'sort-bucket', pages: [27, 28, 29, 30, 31, 32, 33], emphasis: 'core' },
  ] },
  { id: 'c05', number: 5, sourceId: 'c05', missions: [
    { id: 'ppt-select-minmax', pages: [3, 4, 5, 6, 7], emphasis: 'core' },
    { id: 'divide-quickselect', pages: [8, 9, 10], emphasis: 'core' },
    { id: 'ppt-select-bfprt', pages: [11, 12, 13, 14, 15], emphasis: 'core' },
    { id: 'ppt-select-topk', pages: [16, 17, 18], emphasis: 'core' },
    { id: 'ppt-select-tournament-topk', pages: [19, 20], emphasis: 'core' },
  ] },
  { id: 'c06', number: 6, sourceId: 'c06', missions: [
    { id: 'dp-matrix-chain', pages: [6, 12, 13, 14, 15, 19, 20], emphasis: 'core' },
    { id: 'dp-lcs', pages: [30, 31, 32, 33, 34, 35, 36], emphasis: 'core' },
    { id: 'dp-optimal-bst', pages: [38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51], emphasis: 'core' },
    { id: 'ppt-dp-multistage-longest', pages: [54, 55, 56, 57, 58, 59], emphasis: 'core' },
    { id: 'ppt-dp-lis', pages: [61, 62, 63, 64, 65], emphasis: 'core' },
    { id: 'dp-knapsack-01', pages: [67, 68, 69, 70, 71], emphasis: 'core' },
  ] },
  { id: 'c07', number: 7, sourceId: 'c07', missions: [
    { id: 'ppt-greedy-post-office', pages: [4, 5, 6], emphasis: 'core' },
    { id: 'ppt-dp-weighted-interval', pages: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], emphasis: 'core' },
    { id: 'greedy-activity-selection', pages: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38], emphasis: 'core' },
    { id: 'tree-huffman', pages: [39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52], emphasis: 'core' },
    { id: 'ppt-greedy-refuel', pages: [53, 54, 55, 56, 57, 58, 59, 60], emphasis: 'core' },
  ] },
  { id: 'c08', number: 8, sourceId: 'c08', missions: [
    { id: 'g-representations', pages: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], emphasis: 'core' },
    { id: 'g-search', pages: [12, 13, 14, 15, 16, 17, 18, 23, 24], emphasis: 'core' },
    { id: 'ppt-graph-bipartite-color', pages: [19, 20, 21, 22], emphasis: 'core' },
    { id: 'ppt-graph-dfs-classification', pages: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36], emphasis: 'core' },
    { id: 'g-topology', pages: [37], emphasis: 'core' },
    { id: 'g-components-scc', pages: [41, 42, 43, 44, 45, 46, 47, 48], emphasis: 'core' },
    { id: 'ppt-graph-biconnected', pages: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60], emphasis: 'core' },
  ] },
  { id: 'c09', number: 9, sourceId: 'c09', missions: [
    { id: 'g-mst', pages: [5, 6, 7, 8, 9, 10, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28], emphasis: 'core' },
    { id: 'tree-union-find', pages: [16, 17], emphasis: 'core' },
  ] },
  { id: 'c10', number: 10, sourceId: 'c10', missions: [
    { id: 'g-shortest-path', pages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32], emphasis: 'core' },
  ] },
  { id: 'c11', number: 11, sourceId: 'c11', missions: [
    { id: 'g-max-flow', pages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32], emphasis: 'core' },
    { id: 'ppt-graph-dinic', pages: [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45], emphasis: 'core' },
    { id: 'ppt-graph-bipartite-matching', pages: [46, 47, 48, 49, 50, 51, 52], emphasis: 'core' },
  ] },
  { id: 'c13', number: 13, sourceId: 'c13', missions: [
    { id: 'structure-strings-kmp', pages: [4, 5, 27, 28, 29, 30, 31, 32, 33, 34], emphasis: 'core' },
    { id: 'ppt-string-rabin-karp', pages: [6, 7, 8, 9, 10, 11], emphasis: 'core' },
    { id: 'ppt-string-automaton', pages: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26], emphasis: 'core' },
    { id: 'ppt-string-kmp-all', pages: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39], emphasis: 'core' },
  ] },
  { id: 'c14', number: 14, sourceId: 'c14', missions: [
    { id: 'advanced-turing-language', pages: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], emphasis: 'core' },
    { id: 'advanced-np-certificates', pages: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40], emphasis: 'core' },
  ] },
  { id: 'c15', number: 15, sourceId: 'c15', missions: [
    { id: 'approx-vertex-cover-matching', pages: [2, 3, 4, 5], emphasis: 'core' },
    { id: 'ppt-approx-max3sat', pages: [6, 7, 8, 9], emphasis: 'core' },
    { id: 'ppt-approx-weighted-vertex-cover', pages: [10, 11, 12, 13], emphasis: 'core' },
    { id: 'approx-metric-tsp-mst', pages: [14, 15, 16, 17, 18, 19], emphasis: 'core' },
  ] },
  { id: 'c16', number: 16, sourceId: 'c16', missions: [
    { id: 'advanced-n-queens', pages: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], emphasis: 'core' },
    { id: 'advanced-subset-sum', pages: [15, 16, 17, 18, 19, 20], emphasis: 'core' },
    { id: 'ppt-search-queens-fifo', pages: [21, 22, 23, 24, 25, 26], emphasis: 'core' },
  ] },
  { id: 'homework', number: null, sourceId: 'homework', missions: [
    { id: 'divide-master-theorem', pages: [1, 2], emphasis: 'core' },
    { id: 'ppt-divide-market', pages: [3, 4, 5, 6], emphasis: 'core' },
    { id: 'ppt-sort-radix-base-n', pages: [7, 8], emphasis: 'core' },
    { id: 'ppt-dp-rod-cutting', pages: [9, 10, 11], emphasis: 'core' },
    { id: 'ppt-graph-dfs-classification', pages: [12, 13, 14, 16], emphasis: 'core' },
    { id: 'g-components-scc', pages: [15, 16], emphasis: 'core' },
  ] },
  { id: 'exam', number: null, sourceId: 'exam', missions: [
    { id: 'foundation-asymptotics', pages: [1], emphasis: 'core' },
    { id: 'divide-master-theorem', pages: [1], emphasis: 'core' },
    { id: 'ppt-merge-kway', pages: [1], emphasis: 'core' },
    { id: 'tree-huffman', pages: [1], emphasis: 'core' },
    { id: 'ppt-graph-dfs-classification', pages: [1], emphasis: 'core' },
    { id: 'g-components-scc', pages: [1], emphasis: 'core' },
    { id: 'g-mst', pages: [2], emphasis: 'core' },
    { id: 'ppt-np-review-committee', pages: [2], emphasis: 'core' },
  ] },
]
