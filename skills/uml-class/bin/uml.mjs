#!/usr/bin/env node
// CLI for UML class diagrams: validate, render, check.
// In-process only: no child processes, no network, no browser.

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { parseSpecText, validateSpec } from '../renderers/model.mjs';
import { renderDiagram } from '../renderers/render.mjs';
import { checkHtml } from '../renderers/check.mjs';
import { buildSpec, cleanSource, parseFile } from '../renderers/extract/csharp.mjs';

const MAX_CLASSES = 800;
const WARN_CLASSES = 300;

const USAGE = `uml-class — диаграммы классов в HTML

Использование:
  node bin/uml.mjs validate <spec.json> [--json]
  node bin/uml.mjs render class <spec.json> <out.html> [--json]
  node bin/uml.mjs check <out.html> [--json]
  node bin/uml.mjs extract csharp <путь> [--out spec.json] [--root <dir>]
      [--package-by auto|folder|namespace|none] [--include <glob>] [--exclude <glob>]
      [--calls] [--no-fields] [--no-deps]
      [--title <text>] [--stats] [--json]
  node bin/uml.mjs --version

Коды возврата:
  0 — успех
  1 — ошибка спецификации, ввода-вывода или проверки
  2 — слишком большой граф (больше ${MAX_CLASSES} классов)
  3 — неверные аргументы
`;

async function readVersion() {
  try {
    const text = await readFile(new URL('../../../package.json', import.meta.url), 'utf8');
    return JSON.parse(text).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function fail(message, code = 3) {
  console.error(`uml-class: ${message}`);
  process.exit(code);
}

async function loadSpec(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    return { ioError: `cannot read ${path}: ${error.code ?? error.message}` };
  }
  const parsed = parseSpecText(text);
  if (!parsed.ok) return { parseError: parsed.error };
  return validateSpec(parsed.value);
}

function reportSpecFailure(result, json) {
  if (result.ioError) {
    console.error(`uml-class: ${result.ioError}`);
    process.exit(1);
  }
  if (result.parseError) {
    if (json) console.log(JSON.stringify({ ok: false, errors: [{ path: '$', message: result.parseError }] }));
    else console.error(`uml-class: ${result.parseError}`);
    process.exit(1);
  }
  if (json) {
    console.log(JSON.stringify({ ok: false, errors: result.errors }, null, 2));
  } else {
    for (const error of result.errors) {
      console.error(`${error.path}: ${error.message}`);
    }
  }
  process.exit(1);
}

async function commandValidate(path, json) {
  const result = await loadSpec(path);
  if (!result.ok) reportSpecFailure(result, json);
  const stats = { classes: result.spec.classes.length, relations: result.spec.relations.length };
  if (json) console.log(JSON.stringify({ ok: true, stats }, null, 2));
  else console.log(`ok: ${stats.classes} классов, ${stats.relations} связей`);
  return 0;
}

async function commandRender(specPath, outPath, json) {
  const result = await loadSpec(specPath);
  if (!result.ok) reportSpecFailure(result, json);

  const classCount = result.spec.classes.length;
  if (classCount > MAX_CLASSES) {
    const message = `too many classes: ${classCount} > ${MAX_CLASSES}`;
    if (json) console.log(JSON.stringify({ ok: false, errors: [{ path: 'classes', message }] }));
    else console.error(`uml-class: ${message}`);
    process.exit(2);
  }
  if (classCount > WARN_CLASSES) {
    console.error(`uml-class: warning: ${classCount} classes — the diagram will be dense`);
  }

  const rendered = renderDiagram(result.spec);
  const html = rendered.html;

  try {
    await mkdir(dirname(resolve(outPath)), { recursive: true });
    await writeFile(outPath, html, 'utf8');
  } catch (error) {
    console.error(`uml-class: cannot write ${outPath}: ${error.code ?? error.message}`);
    process.exit(1);
  }

  const hash = createHash('sha256').update(html).digest('hex');
  const receiptPath = outPath.replace(/\.html?$/i, '') + '.receipt.json';
  const receipt = {
    schemaVersion: 1,
    tool: '@alex/uml-class-dsh',
    version: await readVersion(),
    generatedAt: new Date().toISOString(),
    artifact: { path: resolve(outPath), sha256: hash, bytes: Buffer.byteLength(html, 'utf8') },
    stats: rendered.stats,
    warnings: rendered.warnings,
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          artifact: { path: resolve(outPath), sha256: hash, bytes: receipt.artifact.bytes },
          receipt: resolve(receiptPath),
          stats: rendered.stats,
          warnings: rendered.warnings,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(resolve(outPath));
  }
  return 0;
}

async function commandCheck(htmlPath, json) {
  let html;
  try {
    html = await readFile(htmlPath, 'utf8');
  } catch (error) {
    console.error(`uml-class: cannot read ${htmlPath}: ${error.code ?? error.message}`);
    process.exit(1);
  }
  const result = checkHtml(html);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(
      `ok: ${result.stats.nodes} узлов, ${result.stats.edges} связей, ${result.stats.expanders} разворачивателей`,
    );
  } else {
    for (const error of result.errors) console.error(`check: ${error}`);
  }
  return result.ok ? 0 : 1;
}

const SKIP_DIRS = new Set([
  'bin',
  'obj',
  'Library',
  'Temp',
  'Logs',
  'node_modules',
  '.git',
  '.vs',
  'TestResults',
  'Packages',
]);

function globToRegExp(glob) {
  const source = glob.replace(/\\/g, '/');
  let out = '';
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (c === '*') {
      if (source[i + 1] === '*') {
        i += 1;
        if (source[i + 1] === '/') {
          i += 1;
          out += '(?:.*/)?';
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else {
      out += /[.+^${}()|[\]\\]/.test(c) ? `\\${c}` : c;
    }
  }
  return new RegExp(`^${out}$`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const equals = token.indexOf('=');
    if (equals > 0) {
      flags[token.slice(2, equals)] = token.slice(equals + 1);
      continue;
    }
    const name = token.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[name] = next;
      i += 1;
    } else {
      flags[name] = true;
    }
  }
  return { positional, flags };
}

async function collectCsharp(target) {
  const files = [];
  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (entry.name.endsWith('.cs')) {
        files.push(full);
      }
    }
  };
  const info = await stat(target);
  if (info.isDirectory()) await walk(target);
  else files.push(target);
  return files.sort();
}

async function commandExtract(argv) {
  const { positional, flags } = parseArgs(argv);
  const language = positional[0];
  if (!language) fail('extract требует язык: extract csharp <путь>');
  if (language !== 'csharp') fail(`неизвестный язык "${language}" (пока поддерживается csharp)`);

  const target = positional[1];
  if (!target) fail('extract csharp требует путь к папке или файлу');

  const root = resolve(typeof flags.root === 'string' ? flags.root : target);
  const include = typeof flags.include === 'string' ? globToRegExp(flags.include) : null;
  const exclude = typeof flags.exclude === 'string' ? globToRegExp(flags.exclude) : null;

  let files;
  try {
    files = await collectCsharp(resolve(target));
  } catch (error) {
    console.error(`uml-class: не удалось прочитать ${target}: ${error.code ?? error.message}`);
    return 1;
  }

  const selected = files.filter((file) => {
    const relativePath = relative(root, file).replace(/\\/g, '/');
    if (include && !include.test(relativePath)) return false;
    if (exclude && exclude.test(relativePath)) return false;
    return true;
  });
  if (selected.length === 0) fail('не найдено ни одного .cs файла');

  const types = [];
  const warnings = [];
  for (const file of selected) {
    const text = await readFile(file, 'utf8');
    const parsed = parseFile(cleanSource(text), file);
    if (parsed.length === 0) warnings.push(`нет объявлений типов: ${relative(root, file)}`);
    types.push(...parsed);
  }

  const built = buildSpec(types, {
    root,
    packageBy: typeof flags['package-by'] === 'string' ? flags['package-by'] : 'auto',
    title: typeof flags.title === 'string' ? flags.title : undefined,
    calls: flags.calls === true,
    includeFields: flags['no-fields'] !== true,
    includeDependencies: flags['no-deps'] !== true,
  });

  const validated = validateSpec(built.spec);
  if (!validated.ok) {
    for (const error of validated.errors) {
      console.error(`extract: ${error.path}: ${error.message}`);
    }
    return 1;
  }

  const maxClasses = Number(flags['max-classes'] ?? MAX_CLASSES);
  if (built.spec.classes.length > maxClasses) {
    console.error(`uml-class: слишком много классов: ${built.spec.classes.length} > ${maxClasses}`);
    return 2;
  }

  const payload = `${JSON.stringify(built.spec, null, 2)}\n`;
  const stats = {
    files: selected.length,
    classes: built.spec.classes.length,
    relations: built.spec.relations.length,
    packages: built.spec.packages.length,
    bytes: payload.length,
    tokens: Math.ceil(payload.length / 4),
    warnings: [...warnings, ...built.warnings],
  };

  if (flags.out) {
    const outPath = resolve(String(flags.out));
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, payload, 'utf8');
  } else if (flags.json !== true) {
    process.stdout.write(payload);
  }

  if (flags.json === true) {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    for (const warning of stats.warnings) console.error(`extract: ${warning}`);
    if (flags.stats) {
      console.log(
        `stats: файлов ${stats.files}, классов ${stats.classes}, связей ${stats.relations}, зон ${stats.packages}, ~${stats.tokens} токенов спеки`,
      );
    } else if (flags.out) {
      console.log(`ok: ${stats.classes} классов, ${stats.relations} связей → ${String(flags.out)}`);
    }
  }
  return 0;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(await readVersion());
    return 0;
  }
  if (argv[0] === 'extract') {
    return commandExtract(argv.slice(1));
  }
  const json = argv.includes('--json');
  const positional = argv.filter((argument) => !argument.startsWith('--'));
  const command = positional.shift();

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(USAGE);
    return 0;
  }
  if (command === 'version') {
    console.log(await readVersion());
    return 0;
  }

  if (command === 'validate') {
    if (positional.length !== 1) fail('validate требует путь к spec.json');
    return commandValidate(positional[0], json);
  }

  if (command === 'render') {
    const rest = positional[0] === 'class' ? positional.slice(1) : positional;
    if (rest.length !== 2) fail('render требует: render class <spec.json> <out.html>');
    return commandRender(rest[0], rest[1], json);
  }

  if (command === 'check') {
    if (positional.length !== 1) fail('check требует путь к HTML');
    return commandCheck(positional[0], json);
  }

  fail(`неизвестная команда "${command}"`);
  return 3;
}

const code = await main();
process.exitCode = code;
