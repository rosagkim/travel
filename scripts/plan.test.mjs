import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkPlans, createPlan, listPlans } from './plan.mjs';

const template = readFileSync(new URL('../plan/template.md', import.meta.url), 'utf8');

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'plan-check-'));
  const directory = join(root, 'plan');
  mkdirSync(directory);
  for (const name of ['README.md', 'decisions.md']) writeFileSync(join(directory, name), '# 기획 관리\n');
  writeFileSync(join(directory, 'template.md'), template);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return directory;
}

test('실제 기획이 없는 상태도 정상이며 빈 기획을 자동 생성하지 않는다', (t) => {
  const directory = fixture(t);
  assert.deepEqual(listPlans(directory), []);
  assert.deepEqual(checkPlans(directory), []);
});

test('초안을 만들되 기존 기획은 덮어쓰지 않고 폴더 밖에는 쓰지 않는다', (t) => {
  const directory = fixture(t);
  const path = createPlan(directory, 'sample-topic', '논의 $& 주제');
  const original = readFileSync(path, 'utf8');
  assert.match(original, /^# 논의 \$& 주제/m);
  assert.match(original, /^상태: 초안/m);
  assert.throws(() => createPlan(directory, 'sample-topic', '바꾼 내용'), /덮어쓰지/);
  assert.equal(readFileSync(path, 'utf8'), original);
  assert.throws(() => createPlan(directory, '../outside', '범위 밖'), /파일 이름/);
  assert.throws(() => createPlan(directory, 'another-topic', '제목\n상태: 완료'), /한 줄/);
  assert.deepEqual(checkPlans(directory), []);
});

test('합의 상태에는 확정한 범위와 확인 가능한 완료 조건이 필요하다', (t) => {
  const directory = fixture(t);
  const path = createPlan(directory, 'sample-topic', '논의 주제');
  writeFileSync(path, readFileSync(path, 'utf8').replace('상태: 초안', '상태: 합의'));
  assert.ok(checkPlans(directory).some((error) => error.includes('미정')));
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll('미정', '구체적으로 확인한 내용'));
  assert.deepEqual(checkPlans(directory), []);
  writeFileSync(path, readFileSync(path, 'utf8').replace('- [ ] 구체적으로 확인한 내용', '체크리스트 없음'));
  assert.ok(checkPlans(directory).some((error) => error.includes('체크리스트')));
});

test('완료 상태에는 모든 완료 조건과 검증 기록이 필요하다', (t) => {
  const directory = fixture(t);
  const path = createPlan(directory, 'sample-topic', '논의 주제');
  let content = readFileSync(path, 'utf8').replace('상태: 초안', '상태: 완료').replaceAll('미정', '구체적으로 확인한 내용');
  writeFileSync(path, content);
  assert.ok(checkPlans(directory).some((error) => error.includes('확인하지 않은')));
  content = content.replace('- [ ]', '- [x]').replace('## 구현과 검증\n\n구체적으로 확인한 내용', '## 구현과 검증\n\n미정');
  writeFileSync(path, content);
  assert.ok(checkPlans(directory).some((error) => error.includes('검증 결과')));
  writeFileSync(path, content.replace('## 구현과 검증\n\n미정', '## 구현과 검증\n\n실행한 검증과 확인한 결과'));
  assert.deepEqual(checkPlans(directory), []);
});

test('상태 오기·필수 항목 누락·깨진 상대 링크를 검사한다', (t) => {
  const directory = fixture(t);
  const path = createPlan(directory, 'sample-topic', '논의 주제');
  writeFileSync(path, readFileSync(path, 'utf8').replace('상태: 초안', '상태: 아무거나').replace('## 사용자 흐름', '## 다른 항목') + '\n[없는 문서](missing.md)\n[합의 기록](../decisions.md)\n');
  const errors = checkPlans(directory);
  assert.ok(errors.some((error) => error.includes('상태를')));
  assert.ok(errors.some((error) => error.includes('사용자 흐름')));
  assert.ok(errors.some((error) => error.includes('missing.md')));
  assert.ok(!errors.some((error) => error.includes('../decisions.md')));
});

test('목록과 상태는 별도 색인 없이 실제 기획 파일에서 읽는다', (t) => {
  const directory = fixture(t);
  createPlan(directory, 'z-topic', '나중 주제');
  const path = createPlan(directory, 'a-topic', '먼저 주제');
  writeFileSync(path, readFileSync(path, 'utf8').replace('상태: 초안', '상태: 보류'));
  assert.deepEqual(listPlans(directory).map((doc) => [doc.name, doc.statuses[0]]), [
    ['a-topic.md', '보류'], ['z-topic.md', '초안'],
  ]);
});

test('코드 예시에 들어 있는 상태·제목·링크는 실제 기획으로 해석하지 않는다', (t) => {
  const directory = fixture(t);
  const path = createPlan(directory, 'sample-topic', '논의 주제');
  writeFileSync(path, readFileSync(path, 'utf8') + '\n```md\n상태: 완료\n## 완료 조건\n[예시](missing.md)\n```\n');
  assert.deepEqual(checkPlans(directory), []);
  assert.deepEqual(listPlans(directory)[0].statuses, ['초안']);
});
