// Live Journey Home 레이아웃 계약이 VISUAL_DIRECTION_LOCK_V11을 지키는지 검증한다.
//
// 목표 화면의 정보 밀도를 좌표로 고정했더라도, 3D 뷰포트가 58% 아래로 내려가거나
// 러너가 화면에서 작아지면 정본 위반이다. 사람이 눈으로 재지 않도록 숫자로 막는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const layout = JSON.parse(
  readFileSync(join(repositoryRoot, "content/v11/ui/live-home-layout.json"), "utf8"),
);

// 의존성을 늘리지 않기 위해 필요한 스칼라와 목록만 읽는 최소 파서를 쓴다.
function readVisualLock() {
  const text = readFileSync(
    join(repositoryRoot, "requirements/v11/VISUAL_DIRECTION_LOCK_V11.yaml"),
    "utf8",
  );
  const scalar = (key) => {
    const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return match ? match[1].trim() : null;
  };
  const list = (key) => {
    const match = text.match(new RegExp(`^${key}:\\s*\\[(.+)\\]$`, "m"));
    return match ? match[1].split(",").map((value) => value.trim()) : null;
  };
  const block = (key) => {
    const lines = text.split("\n");
    const start = lines.findIndex((line) => line.trim() === `${key}:`);
    if (start < 0) return [];
    const items = [];
    for (const line of lines.slice(start + 1)) {
      const match = line.match(/^\s+-\s+(.+)$/);
      if (!match) break;
      items.push(match[1].trim());
    }
    return items;
  };
  return {
    canvas: scalar("reference_canvas"),
    viewportMinPercent: Number(scalar("live_3d_viewport_min_percent")),
    runnerPercent: list("my_runner_screen_height_percent").map(Number),
    forbidden: block("forbidden"),
  };
}

const lock = readVisualLock();
const band = (id) => layout.bands.find((entry) => entry.id === id);
const { width, height } = layout.reference_canvas;

test("the layout targets the locked reference canvas", () => {
  assert.equal(`${width}x${height}`, lock.canvas);
});

test("bands tile the canvas exactly, with no gap and no overlap", () => {
  const ordered = [...layout.bands].sort((a, b) => a.top - b.top);
  let cursor = 0;
  for (const entry of ordered) {
    assert.equal(
      entry.top,
      cursor,
      `band ${entry.id} starts at ${entry.top} but the previous band ended at ${cursor}`,
    );
    cursor = entry.top + entry.height;
  }
  assert.equal(cursor, height, "the bands must cover the full canvas height");
});

test("the live 3D viewport keeps at least the locked share of the screen", () => {
  const viewport = band("live_viewport");
  const percent = (viewport.height / height) * 100;
  assert.ok(
    percent >= lock.viewportMinPercent,
    `viewport is ${percent.toFixed(1)}% but the lock requires at least ${lock.viewportMinPercent}%`,
  );
});

test("My Runner stays inside the locked screen-height range", () => {
  const [minimum, maximum] = lock.runnerPercent;
  const actual = layout.my_runner.screen_height_percent;
  assert.ok(
    actual >= minimum && actual <= maximum,
    `runner is ${actual}% of screen height, outside [${minimum}, ${maximum}]`,
  );
});

test("My Runner is drawn inside the viewport, not behind an opaque band", () => {
  const viewport = band("live_viewport");
  const runnerHeight = (layout.my_runner.screen_height_percent / 100) * height;
  const runnerTop = layout.my_runner.ground_contact_y - runnerHeight;
  assert.ok(
    runnerTop >= viewport.top,
    `runner head at ${runnerTop.toFixed(0)} is above the viewport top ${viewport.top}`,
  );
  assert.ok(
    layout.my_runner.ground_contact_y <= viewport.top + viewport.height,
    "runner feet fall below the viewport",
  );
});

test("the bottom navigation is exactly the five locked destinations", () => {
  const nav = band("bottom_nav");
  assert.deepEqual(
    nav.items.map((item) => item.id),
    ["home", "runner", "run", "world", "crew"],
  );
});

test("RUN is centred and the largest destination", () => {
  const nav = band("bottom_nav");
  const run = nav.items.find((item) => item.id === "run");
  assert.equal(run.center_x, width / 2, "RUN must sit on the horizontal centre");
  for (const item of nav.items) {
    if (item.id === "run") continue;
    assert.ok(
      run.width > item.width,
      `RUN (${run.width}) must be wider than ${item.id} (${item.width})`,
    );
  }
});

test("every bottom navigation item is reachable above the safe-area inset", () => {
  const nav = band("bottom_nav");
  const usable = nav.height - layout.safe_area.bottom_inset_max;
  assert.ok(usable > 0, "the safe-area inset consumes the whole navigation band");
  for (const item of nav.items) {
    const left = item.center_x - item.width / 2;
    const right = item.center_x + item.width / 2;
    assert.ok(left >= 0, `${item.id} is cut off the left edge`);
    assert.ok(right <= width, `${item.id} is cut off the right edge`);
  }
});

test("no slot in any band overflows the canvas width", () => {
  for (const entry of layout.bands) {
    for (const slot of entry.slots ?? []) {
      assert.ok(
        slot.x + slot.width <= width,
        `${entry.id}.${slot.id} ends at ${slot.x + slot.width}, past the ${width}px canvas`,
      );
    }
  }
});

test("the technique deck fits its band width", () => {
  const deck = band("technique_deck");
  const used = deck.slot_count * deck.slot_width + (deck.slot_count - 1) * deck.slot_gap;
  assert.ok(used <= width, `deck needs ${used}px but the canvas is ${width}px`);
});

test("the layout forbids every visually locked item it can express", () => {
  for (const item of ["damage_number", "hp_bar", "copied_reference_ui"]) {
    assert.ok(
      layout.forbidden.includes(item),
      `the layout must forbid ${item}`,
    );
  }
  // 시각 lock이 금지한 항목이 레이아웃에 슬롯으로 존재하면 안 된다.
  const serialised = JSON.stringify(layout).toLowerCase();
  for (const term of ["monster", "weapon", "damage_value", "boss_hp"]) {
    assert.ok(
      !serialised.includes(`"${term}"`),
      `the layout must not declare a ${term} slot`,
    );
  }
});
