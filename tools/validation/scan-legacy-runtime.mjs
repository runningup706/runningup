// V11 활성 런타임과 콘텐츠에서 이전 전투 계열 개념이 남았는지 검사한다.
import { repositoryRoot, scanActiveLegacy } from "../lib/v11-catalog.mjs";

const result = scanActiveLegacy(repositoryRoot());
console.log(JSON.stringify(result, null, 2));
if (result.hits.length > 0 || result.forbiddenArchives.length > 0) {
  process.exitCode = 1;
}

