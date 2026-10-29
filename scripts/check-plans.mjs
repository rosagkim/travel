import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const planRoot = resolve(root, "plan");
const files = readdirSync(planRoot).filter((name) => name.endsWith(".md"));
const known = new Set(files);
const failures = [];

function inspectLinks(tokens, file) {
  for (const token of tokens) {
    if (token.type === "link" && !/^(?:[a-z]+:|#|\/)/i.test(token.href)) {
      const target = token.href.split(/[?#]/)[0];
      if (
        target &&
        (!known.has(basename(target)) ||
          resolve(planRoot, target) !== resolve(planRoot, basename(target)))
      ) {
        failures.push(`${file}: 연결한 기획 문서가 없습니다: ${token.href}`);
      }
    }
    if (token.tokens) inspectLinks(token.tokens, file);
    if (token.items) inspectLinks(token.items, file);
  }
}

for (const file of files) {
  const content = readFileSync(resolve(planRoot, file), "utf8");
  if (!/^# .+/m.test(content))
    failures.push(`${file}: 문서 제목(# 제목)이 필요합니다.`);
  inspectLinks(marked.lexer(content), file);
}

if (!files.length) failures.push("plan/에 기획 문서가 필요합니다.");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`기획 문서 ${files.length}개: 제목과 내부 링크 확인 완료`);
}
