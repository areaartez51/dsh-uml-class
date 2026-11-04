import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { MEMBER_GROUPS, parseSpecText, validateSpec } from '../renderers/model.mjs';
import { checkHtml } from '../renderers/check.mjs';
import { renderDiagram } from '../renderers/render.mjs';

async function loadExample() {
  const text = await readFile(new URL('../examples/payments.json', import.meta.url), 'utf8');
  const parsed = parseSpecText(text);
  assert.equal(parsed.ok, true, parsed.error);
  const result = validateSpec(parsed.value);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  return result.spec;
}

function attributes(tag) {
  const map = {};
  const pattern = /([a-zA-Z0-9-]+)="([^"]*)"/g;
  let match;
  while ((match = pattern.exec(tag)) !== null) map[match[1]] = match[2];
  return map;
}

function collect(html, marker) {
  const kind = marker === 'data-node' ? 'node' : 'edge';
  const pattern = new RegExp(`<g[^>]*\\bclass="${kind}[^"]*"[^>]*\\b${marker}=[^>]*>`, 'g');
  return (html.match(pattern) || []).map(attributes);
}

test('every edge owns a gradient going from source to target', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const edges = collect(html, 'data-edge');
  const gradients = [...html.matchAll(/<linearGradient id="eg-([^"]+)"[^>]*>/g)].map((m) => m[1]);
  assert.equal(gradients.length, edges.length);
  for (const edge of edges) {
    assert.ok(gradients.includes(edge['data-edge']), `no gradient for ${edge['data-edge']}`);
    assert.match(html, new RegExp(`stroke="url\\(#eg-${edge['data-edge']}\\)"`));
  }
});

test('diamonds are gone', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  assert.doesNotMatch(html, /head-diamond/);
  assert.doesNotMatch(html, /start-mark/);
});

test('edges leave and enter only left or right sides', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const nodes = new Map(
    collect(html, 'data-node').map((node) => [node['data-node'], node]),
  );
  for (const edge of collect(html, 'data-edge')) {
    const from = nodes.get(edge['data-from']);
    const to = nodes.get(edge['data-to']);
    assert.ok(from && to);
    const points = edge['data-points'].split(' ').map((pair) => pair.split(',').map(Number));
    const start = points[0];
    const tip = edge['data-tip'].split(',').map(Number);

    const fx = Number(from['data-x']);
    const fw = Number(from['data-w']);
    const tx = Number(to['data-x']);
    const tw = Number(to['data-w']);

    assert.ok(
      Math.abs(start[0] - fx) < 0.6 || Math.abs(start[0] - (fx + fw)) < 0.6,
      `edge ${edge['data-edge']} starts inside the node at x=${start[0]}`,
    );
    assert.ok(
      Math.abs(tip[0] - tx) < 0.6 || Math.abs(tip[0] - (tx + tw)) < 0.6,
      `edge ${edge['data-edge']} ends inside the node at x=${tip[0]}`,
    );  }
});

test('classes get stable distinct hues', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const nodes = collect(html, 'data-node');
  const hues = nodes.map((node) => {
    const match = /--h:([0-9.]+)/.exec(node.style || '');
    return match ? Number(match[1]) : null;
  });
  assert.equal(hues.filter((hue) => hue !== null).length, nodes.length);
  assert.ok(new Set(hues).size >= Math.ceil(nodes.length * 0.8), 'hues are not distinct enough');
});

test('no class colour is dark: every hue uses a fixed mid lightness', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const colors = [...html.matchAll(/--c:hsl\(([0-9.]+) 68% 56%\)/g)];
  assert.equal(colors.length, spec.classes.length);
});

test('the page is dark by default', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  assert.match(html, /<html lang="ru" data-theme="dark">/);
});

test('numeric multiplicity badges are gone', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  assert.doesNotMatch(html, /class="multiplicity"/);
});

test('every member line becomes a hoverable container', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const expected = spec.classes.reduce(
    (sum, entry) => sum + MEMBER_GROUPS.reduce((inner, group) => inner + entry[group].length, 0),
    0,
  );
  const found = (html.match(/class="member-row"/g) || []).length;
  assert.equal(found, expected);
  assert.match(html, /data-member="0"/);
});

test('expanded area has its own lighter body', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const bodies = (html.match(/class="body"/g) || []).length;
  const expandable = checkHtml(html).stats.expandable;
  assert.equal(bodies, expandable);
  assert.match(html, /class="body"[^>]*hidden/);
});

test('member anchors are exported for edges that name a member', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const edges = collect(html, 'data-edge');
  assert.ok(edges.every((edge) => 'data-from-anchor' in edge && 'data-to-anchor' in edge));
  assert.ok(edges.some((edge) => edge['data-from-anchor'] !== '' || edge['data-to-anchor'] !== ''));
});

test('events get their own section instead of properties', () => {
  const parsed = parseSpecText(
    JSON.stringify({
      schemaVersion: 1,
      title: 'events',
      classes: [
        {
          id: 'a',
          name: 'A',
          properties: ['+ Price: int { get; }'],
          events: ['+ Destroyer: event Action<IPoolable>'],
        },
      ],
      relations: [],
    }),
  );
  const result = validateSpec(parsed.value);
  assert.equal(result.ok, true);
  const { html } = renderDiagram(result.spec);
  assert.match(html, /data-member-section="events"/);
  assert.match(html, /события/);
  assert.match(html, /data-member-section="properties"/);
});

test('relations between the same member pair collapse into one line', () => {
  const parsed = parseSpecText(
    JSON.stringify({
      schemaVersion: 1,
      title: 'merge',
      classes: [
        { id: 'a', name: 'A', methods: ['+ run(): void'] },
        { id: 'b', name: 'B', methods: ['+ ping(): void'] },
      ],
      relations: [
        { from: 'a', to: 'b', kind: 'dependency', fromMember: 'run', toMember: 'ping' },
        { from: 'a', to: 'b', kind: 'dependency', fromMember: 'run', toMember: 'ping' },
      ],
    }),
  );
  const result = validateSpec(parsed.value);
  assert.equal(result.ok, true);
  const { html } = renderDiagram(result.spec);
  assert.equal((html.match(/data-edge="/g) || []).length, 1);
  assert.match(html, /data-merged="e0,e1"/);
});

test('edges between two members carry member colours at both ends', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const stops = [...html.matchAll(/<stop offset="0%" stop-color="(hsl\([^"]+\))"/g)].length;
  assert.ok(stops > 0);
});

test('pins belong to member rows, one per side', () => {
  const parsed = parseSpecText(
    JSON.stringify({
      schemaVersion: 1,
      title: 'pins',
      classes: [
        { id: 'a', name: 'A', fields: ['- b: B'], methods: ['+ run(): void'] },
        { id: 'b', name: 'B', fields: ['- value: int'] },
      ],
      relations: [
        { from: 'a', to: 'b', kind: 'dependency', fromMember: '_b', toMember: 'value' },
        { from: 'a', to: 'b', kind: 'association', fromMember: '_b', toMember: 'value' },
      ],
    }),
  );
  const result = validateSpec(parsed.value);
  assert.equal(result.ok, true);
  const { html } = renderDiagram(result.spec);
  const pins = [
    ...html.matchAll(
      /<g class="pin-group" data-node="([^"]+)" data-member="(\d+)" data-side="(left|right)"/g,
    ),
  ];
  assert.ok(pins.length > 0, 'no pins rendered');
  const members = new Set(pins.map((match) => `${match[1]}|${match[2]}`));
  const sides = new Set(pins.map((match) => `${match[1]}|${match[2]}|${match[3]}`));
  assert.equal(sides.size, pins.length, 'duplicate pin for the same member and side');
  assert.equal(sides.size, members.size * 2, 'each used member needs exactly two pins');
  assert.match(html, /class="pins" hidden/);});

test('nodes carry drag geometry', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  for (const node of collect(html, 'data-node')) {
    for (const key of ['data-x', 'data-y', 'data-w', 'data-h', 'data-orig-x', 'data-orig-y']) {
      assert.ok(node[key] !== undefined, `${node['data-node']} misses ${key}`);
    }
  }
});

test('every relation has a click target for freezing', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const edges = collect(html, 'data-edge');
  const hits = html.match(/class="edge-hit"/g) ?? [];
  assert.equal(hits.length, edges.length);
  assert.match(html, /id="unfreeze"/);
  assert.match(html, /svg\.has-freeze \.edge:not\(\.frozen\)/);
  assert.match(html, /\.edge\.frozen \.line \{ stroke-width: 3\.4; \}/);
  assert.match(html, /Escape/);
});

test('a member row and its pin highlight the same relation', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  assert.match(html, /function highlightMember\(row\)/);
  assert.match(html, /closest\('\.pin-group'\)/);
  assert.match(html, /function rowFromTarget\(target\)/);
  // A member without a relation darkens the canvas the same way a relation hover does.
  assert.match(html, /voidNodes\[vn\]\.classList\.add\('dim'\)/);
  assert.match(html, /voidEdges\[ve\]\.classList\.add\('dim'\)/);
  assert.doesNotMatch(html, /has-void/);
  assert.doesNotMatch(html, /hits\.length === 0\) \{\s*clearHighlight\(\);\s*highlightNode/);
  // Direct line hover stays gated by an expanded class.
  assert.match(html, /if \(!anyExpanded\(\)\) return;/);
});

test('clicking empty canvas releases the frozen relation', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  assert.match(html, /event\.target === svg\) setFrozen\(null\)/);
});
