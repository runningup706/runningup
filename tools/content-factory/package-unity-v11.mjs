// 검증된 V11 전체 카탈로그와 manifest를 FULL_SIDELOAD Unity 빌드에 포함한다.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const repository = resolve(new URL("../..", import.meta.url).pathname);
const sourceRoot = join(repository, "content/v11");
const targetRoot = join(
  repository,
  "client/unity/Assets/StreamingAssets/RunningUpV11",
);
const manifest = JSON.parse(
  readFileSync(join(sourceRoot, "launch-manifest.json"), "utf8"),
);

mkdirSync(join(targetRoot, "catalogs"), { recursive: true });
copyFileSync(
  join(sourceRoot, "launch-manifest.json"),
  join(targetRoot, "launch-manifest.json"),
);
for (const name of Object.keys(manifest.hashes)) {
  const safeName = basename(name);
  if (safeName !== name) {
    throw new Error(`Unsafe catalog name: ${name}`);
  }
  copyFileSync(
    join(sourceRoot, "catalogs", safeName),
    join(targetRoot, "catalogs", safeName),
  );
}

console.log(
  `UNITY_V11_CONTENT_PASS catalogs=${Object.keys(manifest.hashes).length} ` +
  `routes=${manifest.counts.routes}`,
);

