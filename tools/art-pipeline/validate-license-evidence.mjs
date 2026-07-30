// 인입된 Production Art 자산마다 실제로 확인된 라이선스 기록이 있는지 검증한다.
//
// 기존 게이트는 LICENSE_EVIDENCE.md가 "존재하는지"만 봤다. 빈 파일도 통과했다.
// 무료 자산 경로에서는 이게 특히 위험하다. CC0와 CC-BY-NC가 같은 사이트에 섞여
// 있고, NC 자산을 모르고 넣으면 상용 배포가 불가능해진다. 자산 폴더와 기록을
// 양방향으로 대조해 둘 중 하나라도 빠지면 실패한다.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(scriptDirectory, "../..");
const vendorRoot = path.join(
  repository,
  "client/unity/Assets/RunningUp/ProductionArt/Vendor",
);
const evidencePath = path.join(
  repository,
  "client/unity/Assets/RunningUp/ProductionArt/LICENSE_EVIDENCE.md",
);
const sourcesPath = path.join(repository, "content/v11/art/free-asset-sources.json");

const REQUIRED_FIELDS = ["asset", "version", "publisher", "license", "source", "obtained"];

/**
 * LICENSE_EVIDENCE.md의 항목을 읽는다. 한 항목은 `## <Publisher>/<AssetName>`
 * 제목과 `- key: value` 줄들로 이루어진다.
 */
export function parseEvidence(markdown) {
  const entries = [];
  let current = null;
  for (const rawLine of markdown.split("\n")) {
    const heading = rawLine.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      if (current) entries.push(current);
      current = { id: heading[1], fields: {} };
      continue;
    }
    const field = rawLine.match(/^\s*-\s*([A-Za-z_]+)\s*:\s*(.+?)\s*$/);
    if (field && current) {
      current.fields[field[1].toLowerCase()] = field[2];
    }
  }
  if (current) entries.push(current);
  return entries;
}

/** Vendor/<Publisher>/<AssetName> 두 단계만 자산으로 센다. */
export async function listVendorAssets(root) {
  const found = [];
  let publishers;
  try {
    publishers = await readdir(root, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const publisher of publishers) {
    if (!publisher.isDirectory()) continue;
    const publisherPath = path.join(root, publisher.name);
    const assets = await readdir(publisherPath, { withFileTypes: true });
    for (const asset of assets) {
      if (!asset.isDirectory()) continue;
      const assetPath = path.join(publisherPath, asset.name);
      const contents = await readdir(assetPath);
      const meaningful = contents.filter((name) => !name.endsWith(".meta"));
      found.push({
        id: `${publisher.name}/${asset.name}`,
        path: path.relative(repository, assetPath),
        fileCount: meaningful.length,
      });
    }
  }
  return found;
}

export function evaluate({ assets, entries, sources }) {
  const allowed = new Map(sources.allowed_licenses.map((item) => [item.id, item]));
  const rejected = new Map(sources.rejected_licenses.map((item) => [item.id, item]));
  const problems = [];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  for (const asset of assets) {
    const entry = byId.get(asset.id);
    if (!entry) {
      problems.push({
        kind: "MISSING_LICENSE_RECORD",
        asset: asset.id,
        detail: `${asset.path} 는 인입돼 있는데 LICENSE_EVIDENCE.md에 "## ${asset.id}" 항목이 없다.`,
      });
      continue;
    }
    for (const field of REQUIRED_FIELDS) {
      if (!entry.fields[field]) {
        problems.push({
          kind: "INCOMPLETE_LICENSE_RECORD",
          asset: asset.id,
          detail: `${field} 항목이 비어 있다.`,
        });
      }
    }
    const license = entry.fields.license;
    if (license && rejected.has(license)) {
      problems.push({
        kind: "FORBIDDEN_LICENSE",
        asset: asset.id,
        detail: `${license} 는 인입할 수 없다. ${rejected.get(license).reason}`,
      });
    } else if (license && !allowed.has(license)) {
      problems.push({
        kind: "UNRECOGNISED_LICENSE",
        asset: asset.id,
        detail: `${license} 는 허용 목록에 없다. content/v11/art/free-asset-sources.json 을 먼저 갱신한다.`,
      });
    } else if (license && allowed.get(license).attribution_required) {
      if (!entry.fields.attribution) {
        problems.push({
          kind: "MISSING_ATTRIBUTION",
          asset: asset.id,
          detail: `${license} 는 저작자 표기가 필수다. attribution 항목에 앱 내 크레딧 문구를 적는다.`,
        });
      }
    }
    // 영수증 번호와 계정 정보는 저장소에 남기지 않는다.
    for (const [key, value] of Object.entries(entry.fields)) {
      if (/receipt|order|invoice|account|email|password/i.test(key)) {
        problems.push({
          kind: "SENSITIVE_FIELD",
          asset: asset.id,
          detail: `${key} 는 저장소에 기록하지 않는다.`,
        });
      }
      if (/@/.test(value) && key !== "source") {
        problems.push({
          kind: "SENSITIVE_FIELD",
          asset: asset.id,
          detail: `${key} 에 계정으로 보이는 값이 들어 있다.`,
        });
      }
    }
  }

  const assetIds = new Set(assets.map((asset) => asset.id));
  for (const entry of entries) {
    if (!assetIds.has(entry.id)) {
      problems.push({
        kind: "ORPHAN_LICENSE_RECORD",
        asset: entry.id,
        detail: "기록은 있는데 Vendor 아래에 해당 자산이 없다.",
      });
    }
  }

  return {
    vendorAssetCount: assets.length,
    licenseRecordCount: entries.length,
    problems,
    status:
      assets.length === 0
        ? "NO_VENDOR_ASSETS_YET"
        : problems.length === 0
          ? "LICENSE_EVIDENCE_COMPLETE"
          : "LICENSE_EVIDENCE_INCOMPLETE",
  };
}

async function readEvidenceFile() {
  try {
    await stat(evidencePath);
  } catch {
    return "";
  }
  return readFile(evidencePath, "utf8");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sources = JSON.parse(await readFile(sourcesPath, "utf8"));
  const assets = await listVendorAssets(vendorRoot);
  const entries = parseEvidence(await readEvidenceFile());
  const report = evaluate({ assets, entries, sources });
  console.log(JSON.stringify(report, null, 2));
  // 자산이 아직 없는 것은 정상 상태다. 인입된 자산의 근거가 없을 때만 실패한다.
  if (report.status === "LICENSE_EVIDENCE_INCOMPLETE") {
    process.exitCode = 1;
  }
}
