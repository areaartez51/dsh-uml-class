import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'uml-class-dsh';
export const PACKAGE_NAME = '@areaartez51/uml-class-dsh';

/**
 * Resolve the packaged Skill root.
 *
 * The package is self-contained, so the primary source of truth is this module's
 * own location: `<package>/lib/index.js` → `<package>/skills`. That keeps the
 * plugin working under any npm name (scoped, renamed, vendored), and never
 * depends on a hardcoded package id.
 *
 * `profileBaseUrl` is kept as a compatibility fallback for loaders that mount the
 * package elsewhere in the profile's module tree.
 */
export function resolveSkillRoot(profileBaseUrl) {
  const localRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills');
  if (existsSync(join(localRoot, 'uml-class', 'SKILL.md'))) return localRoot;

  if (!profileBaseUrl) {
    throw new Error(`uml-class-dsh: skills not found next to ${import.meta.url}`);
  }
  let manifestPath;
  try {
    manifestPath = createRequire(profileBaseUrl).resolve(`${PACKAGE_NAME}/package.json`);
  } catch (error) {
    throw new Error(
      `uml-class-dsh: cannot resolve ${PACKAGE_NAME}/package.json from the DSH profile`,
      { cause: error },
    );
  }
  return join(dirname(manifestPath), 'skills');
}
