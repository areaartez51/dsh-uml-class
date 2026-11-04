import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parseSpecText, validateSpec } from '../renderers/model.mjs';

const readFixture = (name) =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const readExample = () =>
  readFile(new URL('../examples/payments.json', import.meta.url), 'utf8');

async function validateFixture(name) {
  const parsed = parseSpecText(await readFixture(name));
  assert.equal(parsed.ok, true, parsed.error);
  return validateSpec(parsed.value);
}

test('example spec is valid', async () => {
  const parsed = parseSpecText(await readExample());
  assert.equal(parsed.ok, true, parsed.error);
  const result = validateSpec(parsed.value);
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.spec.classes.length, 8);
  assert.equal(result.spec.relations.length, 8);
  assert.equal(result.spec.packages.length, 2);
});

test('unknown relation target reports the exact field path', async () => {
  const result = await validateFixture('broken-ref.json');
  assert.equal(result.ok, false);
  const error = result.errors.find((entry) => entry.path === 'relations[0].to');
  assert.ok(error, JSON.stringify(result.errors));
  assert.match(error.message, /unknown class "payment"/);
});

test('duplicate class id is rejected', async () => {
  const result = await validateFixture('dup-id.json');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.path === 'classes[1].id' && /duplicate/.test(entry.message)));
});

test('unknown relation kind lists the allowed values', async () => {
  const result = await validateFixture('bad-kind.json');
  assert.equal(result.ok, false);
  const error = result.errors.find((entry) => entry.path === 'relations[0].kind');
  assert.ok(error);
  assert.match(error.message, /inheritance/);
  assert.match(error.message, /aggregation/);
});

test('self relations are rejected with a clear message', async () => {
  const result = await validateFixture('self-rel.json');
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => /self-relations/.test(entry.message)));
});

test('broken JSON reports line and column', () => {
  const parsed = parseSpecText('{ "schemaVersion": 1, }');
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /line \d+, column \d+/);
});

test('neighbours are symmetric', async () => {
  const parsed = parseSpecText(await readExample());
  const { spec } = validateSpec(parsed.value);
  for (const [id, neighbours] of spec.neighbors) {
    for (const neighbour of neighbours) {
      assert.ok(spec.neighbors.get(neighbour).has(id), `${id} -> ${neighbour} is not symmetric`);
    }
  }
});

test('empty classes array is rejected', () => {
  const result = validateSpec({ schemaVersion: 1, classes: [] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.path === 'classes'));
});
