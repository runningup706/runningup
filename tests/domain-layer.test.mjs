import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The Unity domain layer must stay compilable by plain .NET.
 *
 * client/dotnet compiles the domain layer straight out of the Unity assets so CI can test
 * it with no Editor and no licence. That only works while those files reference nothing
 * from UnityEngine.
 *
 * The include used to be `Assets/RunningUp/**\/*.cs`, which enforced the rule by making
 * the entire Unity client uncompilable-by-construction. That guarded the domain layer at
 * the price of the client: V14ScreenFlowController and the run runtime could not be
 * stored in this repository at all, and those are the files holding the back-navigation
 * and input defects this project has to fix.
 *
 * The include now names the domain layer. These tests are what keep that safe — and they
 * read the globs out of the csproj rather than restating them, so narrowing the project
 * without noticing cannot silently narrow the guard too.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSPROJ = join(ROOT, 'client/dotnet/RunningUp.Domain.Tests/RunningUp.Domain.Tests.csproj');
const CSPROJ_DIR = dirname(CSPROJ);

/** Include globs that point into the Unity assets, as the csproj actually declares them. */
function unityIncludeGlobs() {
  const source = readFileSync(CSPROJ, 'utf8');
  return [...source.matchAll(/<Compile\s+Include="([^"]+)"\s*\/>/g)]
    .map((m) => m[1])
    .filter((glob) => glob.includes('unity/Assets'));
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Resolve `<dir>/**\/*.cs` style globs. That is the only shape the csproj uses. */
function resolveGlob(glob) {
  const suffix = '/**/*.cs';
  assert.ok(glob.endsWith(suffix), `unsupported Include shape: ${glob}`);
  const base = resolve(CSPROJ_DIR, glob.slice(0, -suffix.length));
  return walk(base).filter((f) => f.endsWith('.cs'));
}

/** Strip comments so a sentence *about* UnityEngine is not mistaken for a use of it. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

const globs = unityIncludeGlobs();
const compiled = globs.flatMap(resolveGlob);

test('the csproj compiles the Unity domain layer from a named directory, not the whole client', () => {
  assert.ok(globs.length > 0, 'the csproj must include at least one Unity path');
  for (const glob of globs) {
    assert.ok(
      !/Assets\/RunningUp\/\*\*/.test(glob),
      `Include "${glob}" swallows the entire client; name the domain directory instead`,
    );
  }
});

test('the include actually matches files — an empty glob must not pass vacuously', () => {
  // Without this, deleting or moving the domain layer would turn the UnityEngine check
  // below into a loop over nothing, and it would report success forever.
  assert.ok(compiled.length > 0, `no .cs files matched ${globs.join(', ')}`);
  assert.ok(
    compiled.some((f) => f.endsWith('MonthlyApexLadder.cs')),
    'the Monthly Apex ladder must be part of the compiled domain layer',
  );
});

test('no compiled domain file uses UnityEngine', () => {
  for (const file of compiled) {
    const source = stripComments(readFileSync(file, 'utf8'));
    const relative = file.slice(ROOT.length + 1);
    assert.ok(
      !/^\s*using\s+UnityEngine/m.test(source),
      `${relative} has a UnityEngine using directive; it cannot be compiled by plain .NET`,
    );
    assert.ok(
      !/\bUnityEngine\s*\./.test(source),
      `${relative} references a UnityEngine type; it cannot be compiled by plain .NET`,
    );
  }
});

test('the guard rejects a UnityEngine reference rather than only claiming to', () => {
  // A comment mentioning UnityEngine is fine — MonthlyApexLadder.cs contains exactly such
  // a sentence, and a naive grep for the bare word flags it. Real usage is not fine.
  const commentOnly = `
    /// This file deliberately references nothing from UnityEngine.
    // using UnityEngine; would be wrong here
    using System;
    public class Ok { }
  `;
  const stripped = stripComments(commentOnly);
  assert.ok(!/^\s*using\s+UnityEngine/m.test(stripped));
  assert.ok(!/\bUnityEngine\s*\./.test(stripped));

  for (const offending of [
    'using UnityEngine;\npublic class Bad { }',
    'public class Bad { UnityEngine.Vector3 v; }',
  ]) {
    const s = stripComments(offending);
    assert.ok(
      /^\s*using\s+UnityEngine/m.test(s) || /\bUnityEngine\s*\./.test(s),
      `the guard failed to flag: ${offending}`,
    );
  }
});
