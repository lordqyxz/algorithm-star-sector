/**
 * 站点词表（国际化基础）：所有面向用户的中文集中于此。
 * 数据层与场景层只持有键（R01 / E01 / ui.pick / level['insertion-01'] 等），
 * 显示时经 t() 取词；新增语言 = 新增一份同构词表。
 * 动态数字与对象名词用 {n} 插值；`unit` 为「量词+名词」整体（如「根燃料棒」）。
 */

export const zh = {
  rank: {
    R01: { title: '学徒', note: '任务控制中心 · 地面待命' },
    R02: { title: '资深学徒', note: '完成首段航程的整备与定位' },
    R03: { title: '领航员·机械师', note: '首航认证：领航与整备双轨执证' },
    R04: { title: '舰长', note: '天狼星授衔 · 授圣堂武士衔' },
    R05: { title: '高阶圣堂武士', note: '折跃纪元远征资格' },
    R06: { title: '舰队执行官', note: '深空编队指挥权' },
    R07: { title: '黄金舰队统帅', note: '星门航线总指挥' },
    R08: { title: '执政官', note: '太阳邻域远征议会' },
    R09: { title: '星河传奇', note: '虚空纪元远征者' },
    R10: { title: '万星领主', note: '银心方向最高军衔' },
  },
  engine: {
    E01: { name: '聚变反应堆·待命点火', speed: '0.1c' },
    E02: { name: '聚变反应堆·巡航功率', speed: '0.2c' },
    E03: { name: '聚变冲压引擎（巴萨德采集）', speed: '0.3c' },
    E04: { name: '反物质引擎（亚光速极限）', speed: '1c' },
    E05: { name: '折跃引擎（首次超光速）', speed: '10c' },
    E06: { name: '相位折跃引擎', speed: '40c' },
    E07: { name: '星门折跃引擎', speed: '100c' },
    E08: { name: '虚空引擎', speed: '300c' },
    E09: { name: '母舰级虚空核心', speed: '5000c' },
    E10: { name: '暗物质虚空引擎', speed: '5万c' },
  },
  medal: { gold: '金章', silver: '银章', bronze: '铜章' },
  ui: {
    backToMap: '返回地图',
    undo: '撤销 {n} [U]',
    restart: '重开 [R]',
    zeroPenalty: '零惩罚：撤销和重开都不影响奖章——奖章只看你是否靠撤销过关。',
    armHeldHint: '{holder}夹持的{unit}；{place}上的虚线格是{slot}',
    armEmptyHint: '点「{pick}」取走绿色区右侧第一{unit}',
    pick: '抓取下一{unit} [P]',
    pickPlain: '抓取下一{unit}',
    compare: '与左邻比对 [C]',
    comparePlain: '与左邻比对',
    shift: '右移一格 [S]',
    drop: '放回{slot} [D]',
    verdictGreater: '{left} > {held}：左邻更大，要给它让位',
    verdictLessEqual: '{left} ≤ {held}：找到位置，可以放回',
    verdictEdge: '{slot}已到最左端：免比对，直接放回（这就是 while i>0 的短路边界）',
    verdictNone: '还没有比对结论：先「{compare}」，再决定右移还是放回',
    moves: '⚡ 步数 {n} / 最优 {m}',
    compares: '🔍 比对 {n} / 最优 {m}',
    sortedCount: '已整备 {n} / {m}',
    predictionTitle: '先猜一步',
    predictionOk: '✓ 判断正确',
    predictionRetry: '✗ 再看一眼图上的证据',
    predictionContinue: '继续',
    predictionSeeResult: '查看结算',
    winLine: '{medal}（用了 {n} 次撤销）· 航程 +{ly} 光年',
    lyGain: '航程 +{ly} 光年',
    winStats: '⚡ {moves} 步（最优 {m1}） · 🔍 {compares} 次比对（最优 {m2}）',
    winPerfect: '完美复现标准插入排序的动作数！',
    winCompareHint: '对照理论最优想一想：差距发生在哪{unit}上？',
    winAgain: '再玩一次',
    nextLevel: '下一关',
    // 指挥关
    cmdPick: '抓取',
    cmdCompare: '比对',
    cmdShift: '右移',
    cmdDrop: '放回',
    cmdLoop: '循环',
    cmdPaletteHint: '指令模块（点击放入程序槽，点槽移除）',
    programSlots: '程序槽（{n} 格）',
    run: '运行 ▶ [空格]',
    pause: '暂停 ⏸ [空格]',
    singleStep: '单步',
    clear: '清空',
    runSteps: '⚡ 运行步数 {n}{cap}',
    runStepsCapped: ' / 上限',
    cardsUsed: '指令数 {n} / {m}（金 ≤ {par}）',
    programTimeout: '程序在 200 步内没有完成——检查循环模块：它必须在动作模块之后，才能不断回到开头。',
    redesign: '重新设计',
    cmdWinLine: '{medal}（{n} 条指令）· 航程 +{ly} 光年',
    cmdWinStats: '⚡ 运行 {n} 步 · 💾 程序 {a} / {b} 槽（最优 {par} 条）',
    cmdWinOptimal: '最小指令程序达成——循环把重复动作压缩成了一条指令。',
    cmdWinCompress: '还有压缩空间：哪条指令出现的规律可以交给循环？',
    // 归并关
    leftStream: '左股星流',
    rightStream: '右股星流',
    mergeOutput: '汇合输出（点击星流取队首；快捷键 L / R）',
    takeCount: '取星 {n} / 最优 {m}',
    mergedCount: '已汇合 {n} / {m}',
    mergeWinLine: '{medal}（{n} 次取星）',
    mergeWinRule: '汇合两条有序星流：每次比对队首、取走光度较小者——{n} 颗恒星恰好 {n} 次取星就能完成。',
    mergeWinPerfect: '零失误汇合：星流汇合已成为你的航行本能。',
    mergeWinMiss: '多出的取星来自取错队首——回想"光度小者先入列"。',
    mergeAgain: '再来一次',
    // 探测关
    probeRule: '定位规则：点击紫色区间内的恒星直接探测——每次探测排除一半。快捷键：数字键 = 格号探测。',
    probeCount: '🔍 探测次数 {n} / 最优 {m}',
    remainRange: '剩余区间 {n} / {m}',
    targetSpectrum: '目标光谱 {n}',
    probeHit: '命中',
    probeLow: '偏低 → 排除左半',
    probeHigh: '偏高 → 排除右半',
    probeAttempt: '第 {i} 次探测 A[{idx}] = {v}：{verdict}',
    probeWinLine: '{medal}（{n} 次探测）',
    probeWinLog: '⌈log₂{n}⌉ = {m}：每一次探测都把候选排除一半——这就是对数。',
    probeWinPerfect: '你完美复现了二分查找的排除效率！',
    probeWinHint: '对照 {m} 次的纪录想一想：哪一次探测没有落在中点附近？',
    probeAgain: '再探一次',
    // 晋升与换装
    promote: '🎖 晋升！{title} —— {note}',
    engineSwap: '🔧 引擎换装：{name}（最大 {speed}）',
    nextStop: '下一站 {label}（还需 {ly} 光年）',
    embarkTransit: '启航 → {dest}',
    backTransit: '返航 → 太阳邻域',
  },
  map: {
    title: '太阳邻域',
    intro: '出航前为聚变反应堆整备燃料棒，航程中以恒星光谱定位——逐段驶向真实的恒星。整备步数与比对次数，就是你的航行战绩。',
    lyReadout: '航行里程 {ly} 光年',
    rankEngine: '军衔：{rank} · 引擎：{engine}（最大 {speed}）',
    milestone: '下一站：{label}（还需 {ly} 光年）',
    allLit: '太阳邻域全部航段点亮。',
    taskControl: '任务控制中心',
    taskControlBody: '绿色整备区代表"已整备区"——它就是插入排序的循环不变量：每次抓起新件、放回正确空槽，不变量都向前长大一格。奖章只看一件事：你有没有靠撤销过关。博学笃志，格物明德。',
    challengeCount: '{n} 个挑战',
    commandChallenge: '[指令程序] {n} 项挑战',
    enter: '进入关卡 →',
    lockedShort: '未解锁',
    locked: '完成前一航段后解锁',
    dlc: '三个 DLC 在校准中：深场（深度学习与 Transformer）· 巡天（机器学习原理与应用）· 盖亚（模式识别经典算法）。军衔阶梯已为 DLC 预留至银河系量级。',
  },
  level: {
    'insertion-01': {
      title: '首航 · 比邻星',
      destination: '比邻星（半人马座 α 星 C）',
      brief: '首段航程目的地：比邻星，距地球 4.24 光年，最近的恒星，拥有一颗宜居带行星 Proxima b。抓取下一根燃料棒，与左邻比对功率，决定右移还是放回空槽。',
      holder: '机械臂',
      place: '整备轨',
      slot: '空槽',
      unit: '根燃料棒',
    },
    'insertion-02': {
      title: '天狼双星 · 整备',
      destination: '天狼星（夜空最亮恒星，双星系统）',
      brief: '同样的动作，不同的装填序列。天狼双星的轨道节奏要求折跃引擎的谐振水晶严格成列——切换下面的挑战，感受"输入的样子"如何改变你的步数。',
      holder: '机械臂',
      place: '整备轨',
      slot: '空槽',
      unit: '枚谐振水晶',
    },
    'insertion-03': {
      title: '织女 · 逆风航段',
      destination: '织女星（天琴座 α，带岩屑盘）',
      brief: '岩屑盘掀起逆风，增援舰要摆成航速有序的纵队逐段穿行：调度席把每艘新舰按巡航航速插入航线队列——这是相位折跃点火前的编队纪律。打完这一关，你会亲眼数出 n(n−1)/2。',
      holder: '调度席',
      place: '航线队列',
      slot: '空航位',
      unit: '艘增援舰',
    },
    'insertion-cmd-01': {
      title: 'TRAPPIST-1 · 共振指令',
      destination: 'TRAPPIST-1（七行星轨道共振链）',
      brief: 'TRAPPIST-1 距地球 40.7 光年，七颗行星处于接近轨道共振的链条上。把四个动作写成星门整备程序，交给自动整备机调度护航舰——循环模块就是你的共振链。',
      holder: '自动整备机',
      place: '星门队列',
      slot: '空泊位',
      unit: '艘护航舰',
    },
    'barnard-probe-01': {
      title: '巴纳德 · 光谱定位',
      destination: '巴纳德星（红矮星，5.96 光年）',
      brief: '巴纳德星是第二近的恒星系统。深空没有路标——16 颗候选恒星的光谱已按编号排好，目标光谱 233 藏在其中。每次探测排除一半，4 次内锁定它的位置。',
      holder: '探测艇',
      place: '候选星表',
      slot: '排除区',
      unit: '颗恒星',
    },
    'pleiades-merge-01': {
      title: '昴星团 · 星流汇合',
      destination: '昴星团（444 光年 · 七姊妹疏散星团）',
      brief: '本星际泡的边界在昴星团。两股已按光度排好的恒星流要在星团入口汇合成一列——每次只能取队首，光度小者先入列。取错会被直接拒绝。',
      holder: '汇合闸口',
      place: '星流',
      slot: '空列位',
      unit: '颗恒星',
    },
  },
  variant: {
    'insertion-01-base': { label: '首航整备', detail: '4 根燃料棒' },
    'insertion-02-base': { label: '混合装填', detail: '6 枚谐振水晶' },
    'insertion-02-sorted': { label: '已经有序', detail: '最好情形' },
    'insertion-02-reversed': { label: '完全逆序', detail: '最坏情形' },
    'insertion-03-base': { label: '完全逆序', detail: '6 艘增援舰' },
    'insertion-03-nearly': { label: '近似有序', detail: '只错一处' },
    'insertion-cmd-01-base': { label: '4 艘护航舰', detail: '出航演习' },
    'barnard-probe-01-base': { label: '16 颗恒星', detail: '⌈log₂16⌉ = 4' },
    'pleiades-merge-01-base': { label: '8 颗恒星', detail: '零失误' },
  },
  prediction: {
    'insertion-01-base': {
      prompt: '抓取 1 之后，空槽的左边是 3。与左邻比对后会发生什么？',
      options: ['3 右移一格，空槽向左挪', '1 直接放回原地', '3 和 1 同时消失'],
      explanation: '3 > 1，所以 3 要给 1 让位：3 右移一格，空槽向左挪一格，再继续比对。',
    },
    'insertion-03-base': {
      prompt: '6 艘完全逆序的增援舰，完成调度总共要比对多少次？',
      options: ['15 次 = 5+4+3+2+1', '6 次', '30 次'],
      explanation: '第 j 艘舰要和前面 j−1 艘都比一遍，加起来 5+4+3+2+1=15=n(n−1)/2——这就是最坏情况 Θ(n²) 的来源。',
    },
    'insertion-cmd-01-base': {
      prompt: '5 条指令为什么就能调度好任意 4 艘护航舰？',
      options: ['循环模块让 4 个动作自动重复，直到全部有序', '因为 4 艘护航舰只需要 4 条指令', '自动整备机自己会排序'],
      explanation: '循环 = while 全表有序之前反复执行：抓取/比对/右移/放回每个动作都可能发生多次——5 条指令 = 4 个动作 + 1 个循环，这就是"用循环消除重复"。',
    },
  },
  hud: {
    brandTitle: 'Algorithm',
    brandSubtitle: 'SOLAR NEIGHBORHOOD · 太阳邻域',
    navGame: '太阳邻域',
    navLog: '航行日志',
    navMap: '星图导航',
    navAria: '站点主题导航',
    bannerEyebrow: 'MISSION CONTROL',
    voyageTitle: '航行日志',
    voyageMotto: '博学笃志，格物明德——每一光年的航程，都记录在案。',
    captainFile: '舰长档案',
    statLy: '航行里程',
    statLyUnit: '光年（按最佳奖章折算）',
    statRank: '当前军衔',
    statEngine: '舰载引擎',
    statEngineNote: '最大航速 {speed}',
    statNext: '下一站',
    statNextNote: '还需 {ly} 光年',
    allLit: '太阳邻域全部点亮',
    continue: '继续航行',
    legsTitle: '航段记录 · 太阳邻域',
    legMeta: '{medal} · 航程 {ly} 光年',
    legLocked: '未点亮',
    medalFactorNote: '奖章系数：金 ×1 · 银 ×0.6 · 铜 ×0.3——重玩高奖章即可提升里程。',
    starMapEyebrow: 'STAR MAP',
    starMapHead: '星图导航 · 点击星辰前往',
    starMapFoot: 'ESC 关闭 · 鼠标移动改变视角 · 金色航路连接枢纽与星座',
    hubLabel: '太阳邻域',
    footerCopy: '© 2026 中国科学院大学 UCAS · 博学笃志 格物明德',
    footerBuiltBy: 'Built by',
    footerLicense: '许可：CC BY-NC 4.0 · 禁止商用 · 转载需署名',
    footerAstro: '天文学数据参考：NASA / ESA / Gaia DR3 公开资料',
    gameHostAria: '太阳邻域游戏画面',
  },
} as const

/** 词表条目 id（关卡/变体/预测门按 id 与数据层对应）。 */
export type LevelId = keyof typeof zh.level
export type VariantId = keyof typeof zh.variant
export type PredictionId = keyof typeof zh.prediction

/** 递归推导所有「文本叶子」的点路径（'ui.pick' / 'rank.R04.title' / 'level.insertion-01.brief' …）。 */
type TextPaths<T> = T extends readonly unknown[]
  ? never
  : T extends string
    ? never
    : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${TextPaths<T[K]>}` }[keyof T & string]

export type TextKey = TextPaths<typeof zh>

/** 按点路径取词：t('ui.moves', { n: 3, m: 5 }) → '⚡ 步数 3 / 最优 5'。拼错键名在 typecheck 直接报错。 */
export function t(key: TextKey, vars: Record<string, string | number> = {}): string {
  let node: unknown = zh
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) throw new Error(`locale 缺少词条：${key}`)
    node = (node as Record<string, unknown>)[part]
  }
  if (typeof node !== 'string') throw new Error(`locale 词条不是文本：${key}`)
  let text = node
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value))
  return text
}

/** 奖章中文名（金章/银章/铜章）。MedalTone 用字符串字面量比较，避免引入 types 依赖环。 */
export function medalName(medal: 'gold' | 'silver' | 'bronze'): string {
  return zh.medal[medal]
}
