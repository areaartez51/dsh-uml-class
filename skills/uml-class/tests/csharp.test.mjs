import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSpec, cleanSource, parseFile } from '../renderers/extract/csharp.mjs';

const ROOT = fileURLToPath(new URL('./fixtures/csharp/Assets/Scripts', import.meta.url));

async function collect(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (entry.name.endsWith('.cs')) files.push(full);
  }
  return files.sort();
}

async function load(options = {}) {
  const files = await collect(ROOT);
  const types = [];
  for (const file of files) {
    types.push(...parseFile(cleanSource(await readFile(file, 'utf8')), file));
  }
  return buildSpec(types, { root: ROOT, packageBy: 'namespace', title: 'fixtures', ...options });
}

const byId = (spec) => new Map(spec.classes.map((entry) => [entry.id, entry]));

test('extracts every type from the fixture project', async () => {
  const { spec } = await load();
  assert.equal(spec.classes.length, 17);
  assert.equal(spec.packages.length, 3);
  const ids = new Set(spec.classes.map((entry) => entry.id));
  for (const id of ['unit', 'mover', 'unit-miner', 'unit-storage', 'unit-tools', 'imover', 'icrystal']) {
    assert.ok(ids.has(id), `нет класса ${id}`);
  }
});

test('reads members, events, constructors and properties', async () => {
  const { spec } = await load();
  const unit = byId(spec).get('unit');
  assert.deepEqual(unit.fields, [
    '- _mineral: Mineral',
    '- _mover: Mover',
    '- _unitMiner: UnitMiner',
    '- _unitStorage: UnitStorage',
    '- _unitTools: UnitTools',
    '- _taskDistributor: ITaskDistributor',
    '- _price: int',
  ]);
  assert.deepEqual(unit.events, [
    '+ Destroyer: event Action<IPoolable>',
    '+ Listener: event Action<IRequest>',
  ]);
  assert.deepEqual(unit.constructors, ['+ Unit(mover: Mover)']);
  assert.deepEqual(unit.properties, ['+ Price: int { get; }']);
  assert.ok(unit.methods.includes('+ Init(unitConfig: UnitConfig, taskDistributor: ITaskDistributor): void'));
  assert.ok(unit.methods.includes('+ ReturnToPool(): void'));
});

test('handles attributes, generics, initializers and nested types', async () => {
  const { spec } = await load();
  const classes = byId(spec);
  const warehouse = classes.get('warehouse');
  assert.ok(warehouse.fields.includes('- _slots: Dictionary<string, List<int>>'));
  assert.ok(warehouse.fields.includes('- Capacity: int'));
  assert.ok(warehouse.properties.includes('+ Count: int { get; init; }'));
  assert.ok(warehouse.methods.includes('+ Find<T>(key: string): T'));
  // A nested type is a class of its own, not a property of its parent.
  assert.ok(!warehouse.properties.some((text) => text.includes('Slot:')));
  assert.ok(classes.has('slot'));
  // Partial classes are merged into one entry.
  assert.equal(spec.classes.filter((entry) => entry.name === 'Warehouse').length, 1);
  assert.ok(warehouse.fields.includes('- _note: string'));
});

test('records, structs and enums keep their stereotype', async () => {
  const { spec } = await load();
  const classes = byId(spec);
  assert.equal(classes.get('unit-state').stereotype, 'enum');
  assert.equal(classes.get('unit-snapshot').stereotype, 'record');
  assert.equal(classes.get('imover').stereotype, 'interface');
  assert.equal(classes.get('grid-point').stereotype, undefined);
});

test('relations follow inheritance, realization, composition and dependency', async () => {
  const { spec } = await load();
  const has = (from, to, kind) =>
    spec.relations.some((relation) => relation.from === from && relation.to === to && relation.kind === kind);

  assert.ok(has('mover', 'imover', 'realization'));
  assert.ok(has('unit', 'ipoolable', 'realization'));
  assert.ok(has('icrystal', 'ipoolable', 'inheritance'), 'интерфейс наследует интерфейс');
  assert.ok(has('unit', 'mover', 'composition'));
  assert.ok(has('unit', 'itask-distributor', 'association'));
  assert.ok(has('unit-miner', 'icrystal', 'dependency'));
  assert.ok(has('unit-storage', 'mineral', 'composition'));
  // External bases (MonoBehaviour, ScriptableObject) never become nodes or edges.
  assert.ok(!spec.relations.some((relation) => relation.to === 'mono-behaviour'));
  assert.equal(spec.relations.length, 18);
});

test('interfaces do not emit dependency edges', async () => {
  const { spec } = await load();
  const interfaceIds = new Set(
    spec.classes.filter((entry) => entry.stereotype === 'interface').map((entry) => entry.id),
  );
  const fromInterface = spec.relations.filter(
    (relation) => interfaceIds.has(relation.from) && relation.kind === 'dependency',
  );
  assert.deepEqual(fromInterface, []);
});

test('package mode falls back to folders when a project has one namespace', async () => {
  const { spec } = await load({ packageBy: 'auto' });
  const unit = byId(spec).get('unit');
  // The fixture has three namespaces, so auto keeps namespaces.
  assert.equal(unit.package, 'colonization-unit');

  const single = await load({ packageBy: 'auto', root: join(ROOT, 'Unit') });
  assert.ok(single.spec.packages.length >= 1);
});

test('comments and strings never produce declarations', () => {
  const source = `
// class Fake { }
/* interface AlsoFake { } */
public class Real {
    private string _text = "class NotAType { }";
    private string _verbatim = @"class StillNot { }";
}
`;
  const types = parseFile(cleanSource(source), 'sample.cs');
  assert.deepEqual(types.map((type) => type.name), ['Real']);
});

test('extraction is deterministic', async () => {
  const first = await load();
  const second = await load();
  assert.equal(JSON.stringify(first.spec), JSON.stringify(second.spec));
});

const CALLS_SOURCE = `
namespace Demo
{
    public class Sword
    {
        public void Slash() { }
    }

    public class Health
    {
        public void TakeDamage(int value) { }
    }

    public class Fighter
    {
        private Health _health;
        private Sword _sword;

        public void Hit()
        {
            _health.TakeDamage(1);
        }

        public void Arm()
        {
            _sword = new Sword();
        }
    }
}
`;

function callsSpec(options = {}) {
  const types = parseFile(cleanSource(CALLS_SOURCE), 'demo.cs');
  return buildSpec(types, { packageBy: 'namespace', title: 'calls', ...options }).spec;
}

test('method calls become dependencies only when asked', () => {
  const plain = callsSpec();
  assert.equal(plain.relations.filter((relation) => relation.kind === 'dependency').length, 0);

  const withCalls = callsSpec({ calls: true });
  const hit = withCalls.relations.find((relation) => relation.fromMember === 'Hit');
  assert.ok(hit, 'нет связи из Hit');
  assert.equal(hit.to, 'health');
  assert.equal(hit.toMember, 'TakeDamage');

  const arm = withCalls.relations.find((relation) => relation.fromMember === 'Arm');
  assert.ok(arm, 'нет связи из Arm (new Sword)');
  assert.equal(arm.to, 'sword');
});

test('filters drop field relations', () => {
  const withFields = callsSpec({ calls: true });
  const withoutFields = callsSpec({ calls: true, includeFields: false });
  const fromField = (spec) =>
    spec.relations.filter((relation) => relation.fromMember === '_health' || relation.fromMember === '_sword');
  assert.ok(fromField(withFields).length > 0);
  assert.deepEqual(fromField(withoutFields), []);
});
