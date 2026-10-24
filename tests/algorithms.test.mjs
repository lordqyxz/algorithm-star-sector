import test from "node:test";
import assert from "node:assert/strict";
import { zh } from "../src/game/locale.ts";
import { algorithmsMissions } from "../src/game/simulation/algorithms.ts";

const byId = new Map(algorithmsMissions.map((m) => [m.id, m]));
const result = (id, v) => byId.get(id).trace(v).at(-1).result;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const bruteClosest = (points) =>
  Math.min(
    ...points.flatMap((p, i) => points.slice(i + 1).map((q) => distance(p, q))),
  );
const flow = (jobs, order) => {
  let a = 0,
    b = 0;
  for (const i of order) {
    a += jobs[i][0];
    b = Math.max(a, b) + jobs[i][1];
  }
  return b;
};
const permutations = (xs) =>
  xs.length
    ? xs.flatMap((x, i) =>
        permutations(xs.filter((_, j) => i !== j)).map((rest) => [x, ...rest]),
      )
    : [[]];
const lcsLength = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] =
        a[i - 1] === b[j - 1]
          ? d[i - 1][j - 1] + 1
          : Math.max(d[i - 1][j], d[i][j - 1]);
  return d[a.length][b.length];
};
const matrixChainMinimum = (p, i = 0, j = p.length - 2) => {
  if (i === j) return 0;
  return Math.min(
    ...Array.from({ length: j - i }, (_, offset) => {
      const k = i + offset;
      return (
        matrixChainMinimum(p, i, k) +
        matrixChainMinimum(p, k + 1, j) +
        p[i] * p[k + 1] * p[j + 1]
      );
    }),
  );
};
const maxActivities = (acts, end = -Infinity) => {
  const sorted = acts.slice().sort((a, b) => a[1] - b[1]);
  return sorted.length
    ? Math.max(
        0,
        ...sorted.map(([s, e], i) =>
          s >= end ? 1 + maxActivities(sorted.slice(i + 1), e) : 0,
        ),
      )
    : 0;
};
const deadlineProfit = (jobs) => {
  const slots = Array(Math.max(...jobs.map((j) => j[1]))).fill(false);
  const visit = (i) => {
    if (i === jobs.length) return 0;
    const [_, deadline, profit] = jobs[i];
    let best = visit(i + 1);
    for (let slot = 0; slot < Math.min(deadline, slots.length); slot++)
      if (!slots[slot]) {
        slots[slot] = true;
        best = Math.max(best, profit + visit(i + 1));
        slots[slot] = false;
      }
    return best;
  };
  return visit(0);
};

test("exposes each assigned mission with start and done frames for both deterministic variants", () => {
  assert.equal(algorithmsMissions.length, 18);
  for (const mission of algorithmsMissions)
    for (const variant of [0, 1]) {
      const first = mission.trace(variant),
        second = mission.trace(variant);
      assert.deepEqual(first, second, mission.id);
      assert.notDeepEqual(
        mission.trace(0),
        mission.trace(1),
        `${mission.id} variants`,
      );
      assert.equal(first[0].op, "start");
      assert.equal(first.at(-1).op, "done");
      assert.notEqual(first[0], first[1]);
      assert.ok(first.length < 500, `${mission.id} frame bound`);
      assert.ok(first.length >= 3);
      for (const frame of first) {
        for (const item of frame.output ?? [])
          assert.ok(
            typeof item.value !== "string" || !/^[\[{]/.test(item.value),
            `${mission.id}: output must be human-readable, not serialized JSON`,
          );
        for (const node of frame.nodes ?? []) {
          assert.ok(node.x >= 0 && node.x <= 1, `${mission.id}:${node.id} x`);
          assert.ok(node.y >= 0 && node.y <= 1, `${mission.id}:${node.id} y`);
        }
        const nodeIds = new Set((frame.nodes ?? []).map((node) => node.id));
        for (const edge of frame.edges ?? []) {
          assert.ok(
            nodeIds.has(edge.from),
            `${mission.id}:${edge.from} edge source`,
          );
          assert.ok(
            nodeIds.has(edge.to),
            `${mission.id}:${edge.to} edge target`,
          );
        }
        if (frame.matrix?.active) {
          const [row, column] = frame.matrix.active;
          assert.ok(
            row >= 0 && row < frame.matrix.values.length,
            `${mission.id} active matrix row`,
          );
          assert.ok(
            column >= 0 && column < frame.matrix.values[row].length,
            `${mission.id} active matrix column`,
          );
        }
      }
    }
});

test("Chinese mission copy covers every exported mission id", () => {
  const copy = Object.fromEntries(
    algorithmsMissions.map((mission) => [
      mission.id,
      zh.course.missions[mission.id],
    ]),
  );
  assert.deepEqual(Object.keys(copy).sort(), [...byId.keys()].sort());
  for (const [id, text] of Object.entries(copy)) {
    assert.ok(
      text.title &&
        text.objective &&
        text.invariant &&
        text.complexity &&
        text.explanation &&
        text.transfer,
      id,
    );
    assert.ok(
      text.prediction.prompt &&
        text.prediction.options.length >= 2 &&
        Number.isInteger(text.prediction.answer),
      id,
    );
  }
});

test("divide missions compute their stated numerical answers", () => {
  for (const v of [0, 1]) {
    const sorted = [7, 3, 5, 2, 6, 1]
      .map((_, i) => (v ? [4, 1, 6, 2, 5, 3][i] : [7, 3, 5, 2, 6, 1][i]))
      .sort((a, b) => a - b);
    assert.equal(result("divide-quickselect", v).value, sorted[v ? 4 : 3]);
    assert.equal(result("divide-hanoi", v).length, 2 ** (v ? 2 : 3) - 1);
    const c = result("divide-closest-pair", v);
    assert.equal(c.distance, bruteClosest(c.points.map((p) => [p.x, p.y])));
    assert.deepEqual(
      result("divide-strassen", v).C,
      v
        ? [
            [8, 2],
            [10, 16],
          ]
        : [
            [19, 22],
            [43, 50],
          ],
    );
    const fft = result("divide-fft", v);
    assert.deepEqual(
      fft,
      v
        ? [
            [2, 0],
            [0, 0],
            [2, 0],
            [0, 0],
          ]
        : [
            [3, 0],
            [1, -2],
            [-1, 0],
            [1, 2],
          ],
    );
    const blocked = result("divide-matrix-multiply", v);
    const naive = blocked.A.map((row) =>
      blocked.B[0].map((_, j) =>
        row.reduce((sum, x, k) => sum + x * blocked.B[k][j], 0),
      ),
    );
    assert.deepEqual(blocked.C, naive);
    assert.equal(blocked.verified, true);
  }
  for (const v of [0, 1]) {
    const n = v ? 7 : 8;
    const leaves = Array.from({ length: n }, (_, i) => i + 1).reduce(
      (a, b) => a * b,
      1,
    );
    assert.equal(
      result("divide-comparison-lower-bound", v).lowerBound,
      Math.ceil(Math.log2(leaves)),
    );
    assert.equal(
      result("divide-recursion-tree", v).totalWork,
      (v ? 4 : 5) * (v ? 8 : 16),
    );
    assert.equal(
      byId
        .get("divide-master-theorem")
        .trace(v)
        .filter((f) => f.op === "update").length,
      3,
    );
  }
});

test("greedy and DP schedules/optima agree with exhaustive small references", () => {
  for (const v of [0, 1]) {
    const kn = result("dp-knapsack-01", v),
      cap = kn.capacity;
    const candidates = v
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
        ];
    const best = Math.max(
      ...Array.from({ length: 1 << candidates.length }, (_, mask) => {
        let w = 0,
          z = 0;
        candidates.forEach(([iw, iv], i) => {
          if ((mask >> i) & 1) {
            w += iw;
            z += iv;
          }
        });
        return w <= cap ? z : 0;
      }),
    );
    assert.equal(kn.value, best);
    const flowResult = result("dp-flowshop-exact", v),
      jobs = flowResult.jobs,
      opt = Math.min(
        ...permutations(jobs.map((_, i) => i)).map((p) => flow(jobs, p)),
      );
    assert.equal(flowResult.makespan, opt);
    const john = result("greedy-johnson-flowshop", v);
    const jjobs = v
      ? [
          [7, 3],
          [2, 8],
          [6, 5],
          [4, 9],
        ]
      : [
          [3, 8],
          [12, 2],
          [5, 6],
          [4, 9],
        ];
    const jopt = Math.min(
      ...permutations(jjobs.map((_, i) => i)).map((p) => flow(jjobs, p)),
    );
    assert.equal(john.makespan, jopt);
    const bst = result("dp-optimal-bst", v);
    assert.ok(bst.expectedCost > 0 && bst.expectedCost < 4);
    assert.equal(
      bst.p.reduce((a, b) => a + b, 0) + bst.q.reduce((a, b) => a + b, 0),
      1,
    );
    const lcs = result("dp-lcs", v);
    assert.equal(lcs.lcs.length, lcs.length);
    assert.equal(lcs.length, lcsLength(lcs.x, lcs.y));
    const mc = result("dp-matrix-chain", v);
    assert.equal(mc.minMultiplications, matrixChainMinimum(mc.dimensions));
    const frac = result("greedy-fractional-knapsack", v);
    assert.ok(frac.value > 0);
    const activities = v
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
        ];
    assert.equal(
      result("greedy-activity-selection", v).length,
      maxActivities(activities),
    );
    const deadlineJobs = v
      ? [
          ["A", 1, 35],
          ["B", 3, 30],
          ["C", 2, 25],
          ["D", 2, 20],
        ]
      : [
          ["A", 2, 100],
          ["B", 1, 19],
          ["C", 2, 27],
          ["D", 1, 25],
          ["E", 3, 15],
        ];
    assert.equal(
      byId.get("greedy-job-deadline").trace(v).at(-1).counters.profit,
      deadlineProfit(deadlineJobs),
    );
  }
});

test("recorded snapshots do not share mutable frame state", () => {
  const mission = byId.get("divide-quickselect"),
    first = mission.trace(0);
  const baseline = JSON.stringify(first[0]);
  first[1].result.tamper = true;
  assert.equal(JSON.stringify(mission.trace(0)[0]), baseline);
  assert.equal(mission.trace(0)[1].result.tamper, undefined);
});
