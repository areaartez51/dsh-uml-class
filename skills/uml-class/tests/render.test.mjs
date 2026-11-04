import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { checkHtml } from '../renderers/check.mjs';
import { MEMBER_GROUPS, parseSpecText, validateSpec } from '../renderers/model.mjs';
import { renderDiagram } from '../renderers/render.mjs';

async function loadExample() {
  const text = await readFile(new URL('../examples/payments.json', import.meta.url), 'utf8');
  const parsed = parseSpecText(text);
  assert.equal(parsed.ok, true, parsed.error);
  const result = validateSpec(parsed.value);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  return result.spec;
}

test('html contains classes, members and relations', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  for (const fragment of [
    'OrderService',
    'PaymentGateway',
    'StripeGateway',
    '«interface»',
    'charge(card, amount)',
    'reserve(sku, qty)',
    'module: commerce',
    'поля',
    'конструкторы',
    'методы',
  ]) {
    assert.ok(html.includes(fragment), `missing fragment: ${fragment}`);
  }
});

test('structural check passes', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const result = checkHtml(html);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('rendering is byte-identical across runs', async () => {
  const spec = await loadExample();
  const first = renderDiagram(spec).html;
  const second = renderDiagram(spec).html;
  assert.equal(first, second);
});

test('artifact has no external resources', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /url\(\s*["']?https?:/i);
});

test('expanders exist only for classes with members', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const result = checkHtml(html);
  assert.ok(result.stats.expandable > 0);
  assert.equal(result.stats.expanders, result.stats.expandable);
});

test('every non-empty member group becomes a section', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const expected = spec.classes.reduce(
    (sum, entry) => sum + MEMBER_GROUPS.filter((group) => entry[group].length > 0).length,
    0,
  );
  const found = (html.match(/data-member-section="/g) || []).length;
  assert.equal(found, expected);
});

test('collapsed nodes hide their member blocks', async () => {
  const spec = await loadExample();
  const { html } = renderDiagram(spec);
  const hiddenGroups = (html.match(/class="members"[^>]*hidden/g) || []).length;
  assert.equal(hiddenGroups, checkHtml(html).stats.expandable);
});

test('a class without members renders without expander', () => {
  const parsed = parseSpecText(
    JSON.stringify({
      schemaVersion: 1,
      title: 'plain',
      classes: [{ id: 'a', name: 'A' }],
      relations: [],
    }),
  );
  assert.equal(parsed.ok, true);
  const result = validateSpec(parsed.value);
  assert.equal(result.ok, true);
  const { html } = renderDiagram(result.spec);
  const checked = checkHtml(html);
  assert.equal(checked.stats.expanders, 0);
  assert.equal(checked.ok, true, checked.errors.join('\n'));
});
