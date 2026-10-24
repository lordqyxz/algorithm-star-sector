import test from "node:test";
import assert from "node:assert/strict";
import { treesMissions } from "../src/game/simulation/trees.ts";

const mission = (id) => treesMissions.find((m) => m.id === id);

function checkSnapshots(mission) {
  for (const variant of [0, 1]) {
    const frames = mission.trace(variant);
    assert.equal(frames[0].op, "start", mission.id);
    assert.equal(frames.at(-1).op, "done", mission.id);
    assert.ok(frames.length >= 3, mission.id);
    assert.deepEqual(
      frames,
      mission.trace(variant),
      `${mission.id} deterministic variant ${variant}`,
    );
    for (const frame of frames) {
      const ids = new Set((frame.nodes ?? []).map((n) => n.id));
      assert.ok(ids.size <= 16, mission.id);
      for (const node of frame.nodes ?? [])
        assert.ok(
          node.x >= 0 && node.x <= 1 && node.y >= 0 && node.y <= 1,
          `${mission.id} layout`,
        );
      for (const edge of frame.edges ?? [])
        assert.ok(
          ids.has(edge.from) && ids.has(edge.to),
          `${mission.id} dangling edge`,
        );
      for (const value of Object.values(frame.counters))
        if (typeof value === "number")
          assert.ok(Number.isFinite(value), mission.id);
    }
  }
}

function adjacency(frame) {
  const children = new Map(frame.nodes.map((n) => [n.id, []]));
  const incoming = new Set();
  for (const edge of frame.edges ?? []) {
    if (edge.weight === "left" || edge.weight === "right")
      children.get(edge.from)[edge.weight === "left" ? 0 : 1] = edge.to;
    else if (!edge.weight) children.get(edge.from).push(edge.to);
    else continue;
    incoming.add(edge.to);
  }
  return {
    children,
    roots: [...children.keys()].filter((id) => !incoming.has(id)),
  };
}
function binaryInorder(frame) {
  const nodes = new Map(frame.nodes.map((n) => [n.id, n]));
  const { children, roots } = adjacency(frame);
  const walk = (id) => {
    const [left, right] = children.get(id) ?? [];
    return [
      ...(left ? walk(left) : []),
      nodes.get(id).value,
      ...(right ? walk(right) : []),
    ];
  };
  return roots.length ? walk(roots[0]) : [];
}
function checkAvl(frame) {
  const { children, roots } = adjacency(frame);
  let valid = roots.length === 1;
  const height = (id) => {
    if (!id) return 0;
    const kids = children.get(id),
      left = height(kids[0]),
      right = height(kids[1]);
    if (Math.abs(left - right) > 1) valid = false;
    return 1 + Math.max(left, right);
  };
  height(roots[0]);
  return valid;
}
function checkRedBlack(frame) {
  const nodes = new Map(frame.nodes.map((n) => [n.id, n])),
    { children, roots } = adjacency(frame);
  if (roots.length !== 1 || nodes.get(roots[0]).tone !== "black") return false;
  let valid = true;
  const blackHeight = (id) => {
    if (!id) return 1;
    const n = nodes.get(id),
      [left, right] = children.get(id);
    if (
      n.tone === "red" &&
      [left, right].some((k) => k && nodes.get(k).tone === "red")
    )
      valid = false;
    const a = blackHeight(left),
      b = blackHeight(right);
    if (a !== b) valid = false;
    return a + Number(n.tone === "black");
  };
  blackHeight(roots[0]);
  return valid;
}
function checkBTree(frame) {
  const nodes = new Map(frame.nodes.map((n) => [n.id, n])),
    { children, roots } = adjacency(frame);
  if (roots.length !== 1) return false;
  let valid = true;
  const leafDepths = [];
  const visit = (id, depth, low = -Infinity, high = Infinity, root = false) => {
    const keys = String(nodes.get(id).value).split(" | ").map(Number),
      kids = children.get(id);
    if (
      keys.length > 3 ||
      (!root && keys.length < 1) ||
      keys.some(
        (key, i) => key <= low || key >= high || (i > 0 && keys[i - 1] >= key),
      )
    )
      valid = false;
    if (!kids.length) leafDepths.push(depth);
    else {
      if (kids.length !== keys.length + 1) valid = false;
      kids.forEach((child, i) =>
        visit(
          child,
          depth + 1,
          i === 0 ? low : keys[i - 1],
          i === keys.length ? high : keys[i],
          false,
        ),
      );
    }
  };
  visit(roots[0], 0, -Infinity, Infinity, true);
  return valid && new Set(leafDepths).size === 1;
}
function check23Tree(frame) {
  const nodes = new Map(frame.nodes.map((n) => [n.id, n])),
    { children, roots } = adjacency(frame);
  if (roots.length !== 1) return false;
  let valid = true;
  const depths = [];
  const visit = (id, depth, low = -Infinity, high = Infinity, root = false) => {
    const keys = String(nodes.get(id).value).split(" | ").map(Number),
      kids = children.get(id);
    if (
      keys.length > (root ? 2 : 2) ||
      (!root && keys.length < 1) ||
      keys.some(
        (key, i) => key <= low || key >= high || (i > 0 && keys[i - 1] >= key),
      )
    )
      valid = false;
    if (!kids.length) depths.push(depth);
    else {
      if (kids.length !== keys.length + 1) valid = false;
      kids.forEach((child, i) =>
        visit(
          child,
          depth + 1,
          i === 0 ? low : keys[i - 1],
          i === keys.length ? high : keys[i],
          false,
        ),
      );
    }
  };
  visit(roots[0], 0, -Infinity, Infinity, true);
  return valid && new Set(depths).size === 1;
}

test("all missions emit deterministic bounded snapshots in both variants", () => {
  assert.equal(treesMissions.length, 14);
  for (const id of [
    "tree-properties",
    "tree-traversals",
    "tree-bst",
    "tree-avl",
    "tree-btree",
    "tree-heap",
  ])
    assert.deepEqual(mission(id).sources, ["combined", "structures"]);
  assert.deepEqual(mission("tree-red-black").sources, ["combined"]);
  assert.deepEqual(mission("tree-optimal-search").sources, ["structures"]);
  for (const m of treesMissions) checkSnapshots(m);
  const frames = mission("tree-properties").trace(0),
    first = structuredClone(frames[0]);
  frames.at(-1).formula = "changed";
  assert.deepEqual(frames[0], first);
});
test("BST insertion, deletion, search, and traversals preserve computed order", () => {
  const bst = mission("tree-bst");
  assert.deepEqual(
    bst
      .trace(0)
      .at(-1)
      .output.map((x) => x.value),
    [1, 5, 6, 7, 9, 11, 13],
  );
  assert.deepEqual(
    bst
      .trace(1)
      .at(-1)
      .output.map((x) => x.value),
    [2, 5, 6, 8, 10, 12, 14],
  );
  for (const variant of [0, 1])
    assert.deepEqual(
      binaryInorder(bst.trace(variant).at(-1)),
      bst
        .trace(variant)
        .at(-1)
        .output.map((x) => x.value),
    );
  assert.deepEqual(
    mission("tree-traversals")
      .trace(0)
      .at(-1)
      .output.map((x) => x.value),
    [7, 3, 11, 1, 5, 9, 13],
  );
});
test("AVL, red-black, and B-tree invariants hold after every operation", () => {
  for (const variant of [0, 1]) {
    for (const frame of mission("tree-avl").trace(variant))
      assert.ok(checkAvl(frame), `AVL variant ${variant}`);
    for (const frame of mission("tree-red-black").trace(variant))
      assert.ok(checkRedBlack(frame), `red-black variant ${variant}`);
    const btree = mission("tree-btree").trace(variant);
    for (const frame of btree.slice(1))
      assert.ok(checkBTree(frame), `B-tree variant ${variant}`);
    const keys = btree
      .at(-1)
      .nodes.flatMap((n) => String(n.value).split(" | ").map(Number))
      .sort((a, b) => a - b);
    const expected = variant
      ? [10, 20, 5, 6, 12, 30, 7, 17]
      : [8, 16, 3, 4, 9, 20, 2, 5];
    assert.deepEqual(
      keys,
      expected.sort((a, b) => a - b),
    );
  }
});
test("2–3 tree splits preserve all inserted keys and its stricter node occupancy", () => {
  for (const variant of [0, 1]) {
    const frames = mission("tree-23").trace(variant);
    for (const frame of frames.slice(1))
      assert.ok(check23Tree(frame), `2–3 tree variant ${variant}`);
    const keys = frames
      .at(-1)
      .nodes.flatMap((n) => String(n.value).split(" | ").map(Number))
      .sort((a, b) => a - b);
    const expected = variant
      ? [40, 20, 60, 10, 30, 50, 70]
      : [20, 10, 30, 5, 15, 25, 35];
    assert.deepEqual(
      keys,
      expected.sort((a, b) => a - b),
    );
  }
});
test("Huffman codes are derived from merge edges and reproduce weighted path length", () => {
  for (const variant of [0, 1]) {
    const frame = mission("tree-huffman").trace(variant).at(-1);
    const weights = variant
      ? { A: 2, B: 3, C: 7, D: 9 }
      : { A: 1, B: 2, C: 4, D: 8 };
    const codes = Object.fromEntries(
      frame.output.map((item) => {
        const [key, code] = String(item.value).split(":");
        return [key, code];
      }),
    );
    const codeValues = Object.values(codes);
    assert.equal(Object.keys(codes).length, 4);
    for (let i = 0; i < codeValues.length; i++)
      for (let j = 0; j < codeValues.length; j++)
        if (i !== j)
          assert.ok(!codeValues[j].startsWith(codeValues[i]), "prefix-free");
    assert.equal(
      frame.counters.wpl,
      Object.entries(weights).reduce(
        (sum, [key, w]) => sum + w * codes[key].length,
        0,
      ),
    );
    const children = new Map(frame.nodes.map((node) => [node.id, []])),
      derived = {};
    for (const edge of frame.edges) children.get(edge.to).push(edge);
    const visit = (id, code) => {
      const edges = children.get(id);
      if (!edges.length) derived[id] = code || "0";
      else for (const edge of edges) visit(edge.from, code + edge.weight);
    };
    const roots = frame.nodes
      .map((node) => node.id)
      .filter((id) => !frame.edges.some((edge) => edge.from === id));
    visit(roots[0], "");
    assert.deepEqual(codes, derived);
  }
});
test("threading, forest conversion, trie sharing, and path compression expose actual links", () => {
  for (const variant of [0, 1]) {
    const threadFrames = mission("tree-threaded").trace(variant),
      threaded = threadFrames.at(-1);
    const threadEdges = threaded.edges.filter(
      (edge) => edge.weight === "thread",
    );
    const realEdges = threaded.edges.filter((edge) => edge.weight !== "thread");
    const realChildren = new Map(threaded.nodes.map((node) => [node.id, []])),
      realIncoming = new Set();
    for (const edge of realEdges) {
      realChildren.get(edge.from)[edge.weight === "left" ? 0 : 1] = edge.to;
      realIncoming.add(edge.to);
    }
    const orderedIds = [];
    const inorder = (id) => {
      const [left, right] = realChildren.get(id) ?? [];
      if (left) inorder(left);
      orderedIds.push(id);
      if (right) inorder(right);
    };
    inorder(
      threaded.nodes.map((node) => node.id).find((id) => !realIncoming.has(id)),
    );
    const expectedOrder = orderedIds.map(
      (id) => threaded.nodes.find((node) => node.id === id).value,
    );
    assert.deepEqual(
      threadFrames.at(-2).output.map((item) => item.value),
      expectedOrder,
    );
    const expectedThreads = new Map();
    orderedIds.forEach((id, i) => {
      if (!(realChildren.get(id) ?? [])[1] && orderedIds[i + 1])
        expectedThreads.set(id, orderedIds[i + 1]);
    });
    assert.deepEqual(
      new Map(threadEdges.map((edge) => [edge.from, edge.to])),
      expectedThreads,
    );
    const forest = mission("tree-general-conversion").trace(variant);
    assert.equal(forest[0].counters.roots, 2);
    assert.ok(
      forest.at(-1).edges.some((edge) => edge.weight === "right-sibling"),
    );
    const original = new Map();
    for (const edge of forest[0].edges.filter(
      (edge) => edge.from !== "virtual-root",
    )) {
      if (!original.has(edge.from)) original.set(edge.from, []);
      original.get(edge.from).push(edge.to);
    }
    const encoded = forest.at(-1).edges,
      encodedKids = new Map();
    for (const edge of encoded)
      if (edge.weight) {
        if (!encodedKids.has(edge.from)) encodedKids.set(edge.from, []);
        encodedKids.get(edge.from).push(edge);
      }
    const decodeChildren = (parent) => {
      const first = (encodedKids.get(parent) ?? []).find(
        (edge) => edge.weight === "left-child",
      );
      const result = [];
      let child = first?.to;
      while (child) {
        result.push(child);
        child = (encodedKids.get(child) ?? []).find(
          (edge) => edge.weight === "right-sibling",
        )?.to;
      }
      return result;
    };
    for (const [parent, children] of original)
      assert.deepEqual(decodeChildren(parent), children);
    const roots = decodeChildren("virtual-root");
    assert.equal(roots.length, 2);
    const decoded = forest.at(-4);
    const edgePairs = (edges) =>
      edges.map((edge) => `${edge.from}->${edge.to}`).sort();
    assert.deepEqual(edgePairs(decoded.edges), edgePairs(forest[0].edges));
    assert.deepEqual(
      forest.at(-3).output.map((item) => item.value),
      variant ? ["A", "B", "D", "E", "C", "F"] : ["R", "P", "S", "T", "Q", "U"],
    );
    assert.deepEqual(
      forest.at(-2).output.map((item) => item.value),
      variant ? ["D", "E", "B", "C", "A", "F"] : ["S", "T", "P", "Q", "R", "U"],
    );
    assert.equal(forest[0].counters.links, forest.at(-1).counters.links);
    const uf = mission("tree-union-find").trace(variant);
    const before = new Map(uf[1].edges.map((edge) => [edge.from, edge.to])),
      after = new Map(uf[2].edges.map((edge) => [edge.from, edge.to]));
    assert.notEqual(
      before.get(variant ? "D" : "S"),
      after.get(variant ? "D" : "S"),
    );
    assert.equal(uf.at(-1).counters.components, 3);
  }
  for (const variant of [0, 1]) {
    const trie = mission("tree-trie").trace(variant).at(-1),
      children = new Map(trie.nodes.map((node) => [node.id, []]));
    for (const edge of trie.edges) children.get(edge.from).push(edge);
    const found = [];
    const walk = (id, prefix) => {
      const node = trie.nodes.find((n) => n.id === id),
        value = String(node.value);
      const word = prefix + (id === "root" ? "" : value.replace("✓", ""));
      if (value.includes("✓")) found.push(word);
      for (const edge of children.get(id)) walk(edge.to, word);
    };
    walk("root", "");
    assert.deepEqual(
      found.sort(),
      (variant ? ["car", "cat", "dog"] : ["to", "tea", "ten"]).sort(),
    );
    assert.ok(
      trie.nodes.length <
        1 +
          (variant ? ["car", "cat", "dog"] : ["to", "tea", "ten"]).reduce(
            (sum, word) => sum + word.length,
            0,
          ),
    );
  }
});

test("weighted search heuristic builds an ordered tree and computes its actual weighted depth", () => {
  for (const variant of [0, 1]) {
    const frame = mission("tree-optimal-search").trace(variant).at(-1),
      nodes = new Map(frame.nodes.map((n) => [n.id, n])),
      { children, roots } = adjacency(frame);
    const keys = variant ? ["A", "B", "C", "D"] : ["P", "Q", "R", "S"],
      weights = variant ? [8, 3, 6, 2] : [2, 7, 4, 3],
      sequence = [];
    let cost = 0;
    const walk = (id, depth) => {
      if (!id) return;
      const [left, right] = children.get(id),
        node = nodes.get(id);
      walk(left, depth + 1);
      const index = keys.indexOf(node.value);
      sequence.push(node.value);
      cost += weights[index] * (depth + 1);
      walk(right, depth + 1);
    };
    walk(roots[0], 0);
    assert.deepEqual(sequence, keys);
    assert.equal(cost, frame.counters.weightedCost);
    assert.equal(frame.counters.obstSolved, 0);
  }
});

test("heap priority operations emit minima and a sorted extraction result", () => {
  for (const variant of [0, 1]) {
    const frames = mission("tree-heap").trace(variant),
      output = frames.at(-1).output.map((x) => x.value);
    assert.equal(frames[1].counters.removed, 1);
    assert.deepEqual(
      output,
      [...output].sort((a, b) => a - b),
    );
  }
});
