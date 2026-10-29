import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const planDirectory = fileURLToPath(new URL('../plan/', import.meta.url));
const states = new Set(['초안', '합의', '구현 중', '완료', '보류']);
const headings = ['논의 배경', '목표와 범위', '사용자 흐름', '완료 조건', '열린 질문', '구현과 검증', '변경 기록'];
const placeholders = /^(?:[-*] (?:\[[ xX]\] )?)?(?:미정|TODO|TBD|작성 예정)[.!。]?$/im;

function prose(content) {
  let fence;
  return content.split('\n').map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      return '';
    }
    if (marker) { fence = marker[1]; return ''; }
    return line;
  }).join('\n');
}

export function createPlan(directory, slug, title = slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? '') || slug.length > 80) {
    throw new Error('파일 이름은 영문 소문자·숫자·하이픈으로 입력하세요. 예: feature-name');
  }
  if (!title?.trim() || /[\r\n]/.test(title)) throw new Error('제목은 비어 있지 않은 한 줄이어야 합니다.');
  const template = readFileSync(join(directory, 'template.md'), 'utf8');
  if (!template.includes('{{title}}')) throw new Error('template.md에 {{title}}이 필요합니다.');
  const target = join(directory, 'specs', `${slug}.md`);
  mkdirSync(dirname(target), { recursive: true });
  try {
    writeFileSync(target, template.replace('{{title}}', () => title.trim()), { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`기존 기획은 덮어쓰지 않습니다: ${slug}.md`);
    throw error;
  }
  return target;
}

export function listPlans(directory) {
  const specs = join(directory, 'specs');
  if (!existsSync(specs)) return [];
  return readdirSync(specs, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .map(({ name }) => {
      const path = join(specs, name);
      const content = prose(readFileSync(path, 'utf8'));
      const statuses = [...content.matchAll(/^상태: (.+)$/gm)].map((match) => match[1].trim());
      return { path, content, name, title: content.match(/^# (.+)$/m)?.[1].trim(), statuses };
    });
}

function sections(content) {
  const matches = [...content.matchAll(/^## (.+)$/gm)];
  return new Map(matches.map((match, index) => [
    match[1].trim(), content.slice(match.index + match[0].length, matches[index + 1]?.index).trim(),
  ]));
}

function checkLinks(file, content, repository, errors) {
  content = prose(content).replace(/(`+)[\s\S]*?\1/g, '');
  const links = [
    ...content.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g),
    ...content.matchAll(/^\s*\[[^\]\n]+\]:\s*(<[^>]+>|\S+)/gm),
  ];
  for (const [, raw] of links) {
    const href = raw.trim().match(/^(?:<([^>]+)>|(\S+))/);
    const address = href?.[1] ?? href?.[2] ?? '';
    if (!address || /^(?:[a-z][a-z\d+.-]*:|#)/i.test(address)) continue;
    let destination;
    try { destination = decodeURIComponent(address.split(/[?#]/)[0]); } catch {
      errors.push(`${file}: 잘못된 링크: ${address}`);
      continue;
    }
    if (!destination) continue;
    const target = resolve(dirname(file), destination);
    const fromRoot = relative(repository, target);
    if (isAbsolute(destination) || fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
      errors.push(`${file}: 링크는 저장소 안의 상대 경로를 사용하세요: ${address}`);
    } else if (!existsSync(target)) errors.push(`${file}: 연결한 파일이 없습니다: ${address}`);
  }
}

export function checkPlans(directory) {
  const errors = [];
  const repository = resolve(directory, '..');
  const documents = listPlans(directory);
  const files = new Map(documents.map((doc) => [doc.path, doc.content]));
  for (const name of ['README.md', 'decisions.md', 'template.md']) {
    const path = join(directory, name);
    if (!existsSync(path)) errors.push(`${name}: 기획 관리에 필요한 파일이 없습니다.`);
    else files.set(path, readFileSync(path, 'utf8'));
  }
  for (const [file, content] of files) checkLinks(file, content, repository, errors);
  for (const doc of documents) {
    const fail = (message) => errors.push(`${doc.name}: ${message}`);
    if (!doc.title) fail('제목(# 제목)이 필요합니다.');
    if (doc.statuses.length !== 1 || !states.has(doc.statuses[0])) {
      fail(`상태를 한 번만 지정하세요: ${[...states].join(', ')}`);
    }
    const parts = sections(doc.content);
    for (const heading of headings) if (!parts.get(heading)) fail(`필수 항목이 없습니다: ${heading}`);
    const status = doc.statuses[0];
    if (['합의', '구현 중', '완료'].includes(status)) {
      for (const heading of headings.slice(0, 4)) {
        if (placeholders.test(parts.get(heading) ?? '')) fail(`합의한 기획의 ${heading}에 미정인 내용이 있습니다.`);
      }
      const criteria = parts.get('완료 조건') ?? '';
      if (!/^- \[[ xX]\] .+/m.test(criteria)) fail('완료 조건에 확인 가능한 체크리스트가 필요합니다.');
      if (status === '완료') {
        if (/^- \[ \]/m.test(criteria)) fail('확인하지 않은 완료 조건이 있습니다.');
        if (placeholders.test(parts.get('구현과 검증') ?? '')) fail('완료 처리하려면 구현과 검증 결과를 기록하세요.');
      }
    }
  }
  return errors;
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'new') {
    if (args.length < 1 || args.length > 2) throw new Error('사용법: npm run plan:new -- feature-name "논의 주제"');
    console.log(`초안 생성: ${relative(process.cwd(), createPlan(planDirectory, ...args))}`);
  } else if (command === 'list' && !args.length) {
    const plans = listPlans(planDirectory);
    if (!plans.length) console.log('등록된 기획이 없습니다.');
    else for (const doc of plans) console.log(`[${doc.statuses[0] ?? '상태 없음'}] ${doc.title ?? '제목 없음'} — plan/specs/${doc.name}`);
  } else if (command === 'check' && !args.length) {
    const errors = checkPlans(planDirectory);
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`기획 검사 완료: ${listPlans(planDirectory).length}개 기획, 상태·필수 항목·파일 링크 확인`);
  } else throw new Error('사용 가능한 명령: new, list, check');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
