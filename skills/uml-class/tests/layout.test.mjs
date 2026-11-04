import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildLayout, measureClass, HEADER_H, EXPANDER_H } from '../renderers/layout.mjs';
import { parseSpecText, validateSpec } from '../renderers/model.mjs';

async function loadExample() {
  const text = await readFile(new URL('../examples/payments.json', import.meta.url), 'utf8');
  const parsed = parseSpecText(text);
  assert.equal(parsed.ok, true, parsed.error);
  const result = validateSpec(parsed.value);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  return result.spec;
}

test('measureClass grows with member blocks', () => {
  const plain = measureClass({ id: 'a', name: 'A', stereotype: null, fields: [], properties: [], constructors: [], methods: [] });
  const rich = measureClass({
    id: 'b',
    name: 'B',
    stereotype: null,
    fields: ['- x: int'],
    properties: [],
    constructors: [],
    methods: ['+ run(): void'],
  });
  assert.equal(plain.hasMembers, false);
  assert.equal(plain.height, HEADER_H);
  assert.equal(rich.hasMembers, true);
  assert.equal(rich.height, HEADER_H + EXPANDER_H);
  assert.ok(rich.membersHeight > 0);
  assert.ok(rich.width >= plain.width);
});

test('layout is deterministic', async () => {
  const spec = await loadExample();
  const first = buildLayout(spec);
  const second = buildLayout(spec);
  assert.deepEqual(
    [...first.nodes.values()].map((node) => [node.id, node.x, node.y, node.width, node.height]),
    [...second.nodes.values()].map((node) => [node.id, node.x, node.y, node.width, node.height]),
  );
});

test('inheritance places the child below the parent', async () => {
  const spec = await loadExample();
  const layout = buildLayout(spec);
  const child = layout.nodes.get('stripe-gateway');
  const parent = layout.nodes.get('payment-gateway');
  assert.ok(child.rank > parent.rank, `${child.rank} <= ${parent.rank}`);
});

test('nodes never overlap on the canvas', async () => {
  const spec = await loadExample();
  const layout = buildLayout(spec);
  const nodes = [...layout.nodes.values()];
  for (let index = 0; index < nodes.length; index += 1) {
    for (let other = index + 1; other < nodes.length; other += 1) {
      const a = nodes[index];
      const b = nodes[other];
      const overlap =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      assert.equal(overlap, false, `${a.id} overlaps ${b.id}`);
    }
  }
});

test('vertical gaps leave room for the tallest expanded node', async () => {
  const spec = await loadExample();
  const layout = buildLayout(spec);
  const groups = new Map();
  for (const row of layout.rows) {
    if (!groups.has(row.group)) groups.set(row.group, []);
    groups.get(row.group).push(row);
  }
  for (const rows of groups.values()) {
    rows.sort((a, b) => a.rank - b.rank);
    for (let index = 0; index < rows.length - 1; index += 1) {
      const row = rows[index];
      const next = rows[index + 1];
      const tallest = Math.max(...row.ids.map((id) => layout.nodes.get(id).membersHeight));
      const gap = next.top - row.bottom;
      assert.ok(
        gap >= tallest,
        `gap ${gap} < member height ${tallest} between ranks ${row.rank} and ${next.rank}`,
      );
    }
  }
});
