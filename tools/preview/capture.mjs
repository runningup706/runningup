#!/usr/bin/env node
/**
 * Renders the static preview to PNGs at the three phone sizes the direction names.
 *
 * The HTML page is the reviewable artifact; these are for pasting into a message, an issue
 * or a chat where an HTML file cannot go. They are captures of the DESIGN PROPOSAL, not of
 * the running app, and the stamp burned into every frame says so — which is the point of
 * putting the stamp in the markup rather than adding it here.
 *
 * Playwright is not a dependency of this repository and must not become one: it is a
 * browser download in the install path of a project that does not otherwise need a
 * browser. It is resolved from wherever it happens to be available, and if it is not, this
 * exits 0 with a message rather than failing a build. The HTML preview is the deliverable;
 * the PNGs are a convenience.
 *
 * Usage: node tools/preview/capture.mjs [--playwright <path>]
 */

import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGE = join(ROOT, 'preview', 'index.html');
const OUT = join(ROOT, 'preview', 'png');

/** The three sizes named in the direction, plus what each one is actually for. */
const VIEWPORTS = [
  { id: '360x800', width: 360, height: 800, why: 'the small end of what Android ships' },
  { id: '412x915', width: 412, height: 915, why: 'the common modern size' },
  { id: '1080x1920', width: 1080, height: 1920, why: 'full-resolution, for zooming into detail' },
];

/** Individual screens worth their own file, by element id in the page. */
const FRAMES = [
  'scr-home', 'scr-active', 'scr-world', 'scr-apex', 'scr-myrunner',
  'scr-wardrobe', 'scr-globalevent', 'scr-race', 'scr-training', 'scr-result',
  'scr-state-loading', 'scr-state-empty', 'scr-state-error', 'scr-state-disabled',
];

function resolvePlaywright() {
  const flag = process.argv.indexOf('--playwright');
  const candidates = [
    flag !== -1 ? process.argv[flag + 1] : null,
    process.env.RUNNINGUP_PLAYWRIGHT,
    'playwright',
    '/tmp/pw/node_modules/playwright',
  ].filter(Boolean);
  const require = createRequire(import.meta.url);
  for (const c of candidates) {
    try { return require(c); } catch { /* try the next one */ }
  }
  return null;
}

const playwright = resolvePlaywright();
if (!playwright) {
  console.log('playwright is not available — skipping PNG capture.');
  console.log('The HTML preview at preview/index.html is complete and is the deliverable.');
  console.log('To capture: npm i --no-save playwright && node tools/preview/capture.mjs');
  process.exit(0);
}
if (!existsSync(PAGE)) {
  console.error(`missing ${PAGE} — run tools/preview/build-preview.mjs first`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

/**
 * The container pre-installs Chromium and forbids downloading another one, but the
 * directory carries a build number (`chromium-1194`) that will not match whatever version
 * of the playwright package is resolved. Left to itself Playwright looks for its own
 * pinned build, does not find it, and tells you to run `playwright install` — which is the
 * one thing that must not happen here. So the binary is located rather than assumed.
 */
function findChromium() {
  const explicit = process.env.RUNNINGUP_CHROMIUM;
  if (explicit && existsSync(explicit)) return explicit;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  const dirs = readdirSync(base).filter((d) => d.startsWith('chromium'));
  // Prefer a full Chromium over the headless shell: the shell cannot screenshot an element.
  dirs.sort((a, b) => Number(a.includes('headless')) - Number(b.includes('headless')));
  for (const dir of dirs) {
    for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell',
      'chrome-headless-shell-linux64/chrome-headless-shell']) {
      const full = join(base, dir, rel);
      if (existsSync(full)) return full;
    }
  }
  return undefined;
}

const executablePath = findChromium();
if (!executablePath) {
  console.log('no pre-installed Chromium found — skipping PNG capture.');
  console.log('The HTML preview at preview/index.html is complete and is the deliverable.');
  process.exit(0);
}
console.log(`using ${executablePath}`);

const launch = {
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
};

const browser = await playwright.chromium.launch(launch);
const written = [];

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      // 1x for the whole-page captures: they are 6000 px tall and exist for overview, so
      // 2x quadruples the file size to show detail nobody reads at that zoom. The
      // per-frame captures below are 2x, where the detail is the point.
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(PAGE).href, { waitUntil: 'load' });
    // The only animation on the page is the loading spinner; freezing it keeps captures
    // byte-stable so a re-run does not look like a change.
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important}' });
    const file = join(OUT, `page-${vp.id}.png`);
    await page.screenshot({ path: file, fullPage: true });
    written.push([file, vp.why]);
    await page.close();
  }

  // Individual frames at a size where the detail is legible.
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(PAGE).href, { waitUntil: 'load' });
  await page.addStyleTag({ content: '*{animation:none !important;transition:none !important}' });
  for (const id of FRAMES) {
    const el = await page.$(`#${id} .phone`);
    if (!el) {
      console.error(`::error::frame ${id} is not in the page — the preview and this list disagree`);
      process.exitCode = 1;
      continue;
    }
    const file = join(OUT, `${id.replace(/^scr-/, '')}.png`);
    await el.screenshot({ path: file });
    written.push([file, 'single frame']);
  }
  await page.close();
} finally {
  await browser.close();
}

console.log(`captured ${written.length} PNGs into preview/png/`);
for (const [file, why] of written.slice(0, VIEWPORTS.length)) {
  console.log(`  ${file.replace(`${ROOT}/`, '')}  — ${why}`);
}
console.log(`  + ${written.length - VIEWPORTS.length} individual frames`);
