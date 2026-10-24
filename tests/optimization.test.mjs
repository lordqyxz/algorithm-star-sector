import test from "node:test";
import assert from "node:assert/strict";
import { optimizationMissions } from "../src/game/simulation/optimization.ts";

const run = (id, variant = 0) =>
  optimizationMissions.find((x) => x.id === id).trace(variant);

test("optimization missions expose two deterministic, bounded traces", () => {
  assert.equal(optimizationMissions.length, 9);
  for (const mission of optimizationMissions)
    for (const variant of [0, 1]) {
      const a = mission.trace(variant),
        b = mission.trace(variant);
      assert.deepEqual(a, b, mission.id);
      assert.equal(a[0].op, "start");
      assert.equal(a.at(-1).op, "done");
      for (const f of a) {
        assert.ok(f.formula.length > 0);
        assert.ok(
          Object.values(f.counters).every(
            (x) => typeof x === "string" || Number.isFinite(x),
          ),
        );
        assert.ok(
          !f.matrix ||
            (f.matrix.values.length <= 8 &&
              f.matrix.values.every((row) => row.length <= 10)),
        );
        if (f.matrix) {
          assert.equal(f.matrix.rows.length, f.matrix.values.length);
          for (const row of f.matrix.values)
            assert.equal(row.length, f.matrix.columns.length);
          if (f.matrix.active)
            assert.ok(
              f.matrix.active[0] >= 0 &&
                f.matrix.active[0] < f.matrix.rows.length &&
                f.matrix.active[1] >= 0 &&
                f.matrix.active[1] < f.matrix.columns.length,
            );
          if (f.counters.profitStates)
            assert.equal(
              f.matrix.values.flat().filter((value) => value !== "—").length,
              f.counters.profitStates,
              `${mission.id}: every scaled-profit state shown`,
            );
        }
        assert.ok(!f.nodes || f.nodes.length <= 12);
      }
    }
});

test("greedy set cover covers its full universe", () => {
  const cases = [
    {
      sets: [
        [0, 1, 2],
        [2, 3],
        [3, 4, 5],
        [0, 4, 5],
      ],
      universe: 6,
    },
    {
      sets: [
        [0, 1, 3],
        [1, 2],
        [2, 3, 4],
        [0, 4],
      ],
      universe: 5,
    },
  ];
  for (const v of [0, 1]) {
    const end = run("approx-set-cover-greedy", v).at(-1);
    assert.equal(end.counters.uncovered, 0);
    assert.ok(end.counters.sets > 0);
    const { sets, universe } = cases[v];
    let optimum = sets.length;
    for (let mask = 0; mask < 1 << sets.length; mask++) {
      const covered = new Set(
        sets.flatMap((s, i) => (mask & (1 << i) ? s : [])),
      );
      if (covered.size === universe)
        optimum = Math.min(
          optimum,
          mask.toString(2).replaceAll("0", "").length,
        );
    }
    assert.ok(
      end.counters.sets <= Math.ceil((1 + Math.log(universe)) * optimum),
    );
  }
});

test("subset-sum FPTAS returns a feasible bounded sum", () => {
  const cases = [
    { values: [8, 7, 5, 4, 3], target: 14 },
    { values: [8, 7, 6, 5, 4], target: 15 },
  ];
  for (const v of [0, 1]) {
    const end = run("approx-subset-sum-fptas", v).at(-1);
    assert.ok(end.counters.best <= end.counters.target);
    const { values, target } = cases[v];
    let optimum = 0;
    for (let mask = 0; mask < 1 << values.length; mask++) {
      const sum = values.reduce((s, x, i) => s + (mask & (1 << i) ? x : 0), 0);
      if (sum <= target) optimum = Math.max(optimum, sum);
    }
    assert.ok(end.counters.best >= 0.75 * optimum);
  }
});

test("matching vertex cover and metric preorder tour meet their guarantees", () => {
  const graphs = [
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 2],
    ],
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [1, 4],
    ],
  ];
  for (const v of [0, 1]) {
    const cover = run("approx-vertex-cover-matching", v).at(-1);
    assert.equal(cover.counters.uncovered, 0);
    assert.ok(cover.counters.cover <= 2 * cover.counters.matching);
    const edges = graphs[v],
      n = v ? 5 : 4;
    let optimum = n;
    for (let mask = 0; mask < 1 << n; mask++)
      if (edges.every(([a, b]) => mask & (1 << a) || mask & (1 << b))) {
        optimum = Math.min(
          optimum,
          mask.toString(2).replaceAll("0", "").length,
        );
      }
    assert.ok(cover.counters.cover <= 2 * optimum);
    const tour = run("approx-metric-tsp-mst", v).at(-1);
    assert.ok(tour.counters.tourCost <= 2 * tour.counters.mstCost);
    const distances = run("approx-metric-tsp-mst", v)[0].matrix.values;
    for (let i = 0; i < distances.length; i++)
      for (let j = 0; j < distances.length; j++)
        for (let k = 0; k < distances.length; k++) {
          assert.ok(Math.abs(distances[i][j] - distances[j][i]) < 1e-10);
          assert.ok(
            distances[i][k] <= distances[i][j] + distances[j][k] + 1e-10,
          );
        }
  }
});

test("knapsack FPTAS produces a capacity-feasible selection", () => {
  const cases = [
    {
      items: [
        { w: 2, p: 6 },
        { w: 3, p: 7 },
        { w: 4, p: 9 },
        { w: 5, p: 10 },
      ],
      capacity: 7,
    },
    {
      items: [
        { w: 3, p: 8 },
        { w: 4, p: 9 },
        { w: 5, p: 11 },
        { w: 2, p: 5 },
      ],
      capacity: 8,
    },
  ];
  for (const v of [0, 1]) {
    const end = run("approx-knapsack-fptas", v).at(-1);
    assert.ok(end.counters.weight <= end.counters.capacity);
    assert.ok(end.counters.profit > 0);
    const { items, capacity } = cases[v];
    let optimum = 0;
    for (let mask = 0; mask < 1 << items.length; mask++) {
      const chosen = items.filter((_, i) => mask & (1 << i));
      if (chosen.reduce((s, x) => s + x.w, 0) <= capacity)
        optimum = Math.max(
          optimum,
          chosen.reduce((s, x) => s + x.p, 0),
        );
    }
    assert.ok(end.counters.profit >= 0.75 * optimum);
  }
});

test("seeded heuristic outputs are repeatable and perceptron loss falls", () => {
  for (const id of [
    "heuristic-tabu-search",
    "heuristic-simulated-annealing",
    "heuristic-genetic-algorithm",
  ]) {
    assert.deepEqual(run(id, 0), run(id, 0));
    assert.deepEqual(run(id, 1), run(id, 1));
  }
  for (const v of [0, 1]) {
    const frames = run("neural-perceptron-gradient", v);
    assert.ok(frames.at(-1).counters.loss < frames[0].counters.loss);
    const anneal = run("heuristic-simulated-annealing", v);
    const target = v ? 6 : 3;
    assert.equal(
      anneal[0].counters.energy,
      Math.abs(anneal[0].counters.state - target),
    );
    for (const step of anneal.slice(1, -1)) {
      assert.equal(
        step.counters.energy,
        Math.abs(step.counters.state - target),
      );
      assert.equal(
        step.counters.delta,
        Math.abs(step.counters.candidate - target) -
          Math.abs(step.counters.previousState - target),
      );
    }
    assert.equal(
      anneal.at(-1).counters.bestEnergy,
      Math.abs(anneal.at(-1).counters.best - target),
    );
    const tabu = run("heuristic-tabu-search", v);
    for (const step of tabu.slice(1, -1))
      assert.ok(
        !step.counters.tabu.split(",").includes(String(step.counters.state)),
      );
  }
});
