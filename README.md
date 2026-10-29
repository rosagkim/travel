# 서비스 베이스

기획을 `plan/`에 정리하고 사이트로 이어가는 기본 구조입니다. 구체적인 서비스는 아직 정해지지 않았으며, 현재 사이트는 기획 문서를 확인할 수 있는 시작 화면입니다.

- 사이트: https://rosagkim.github.io/travel/
- 기획 시작: [plan/README.md](plan/README.md)
- 서비스 이름과 소개: `src/site.config.js`

## 로컬 실행

Node.js 24를 사용합니다.

```sh
npm ci
npm run dev
```

```sh
npm run check  # 자바스크립트 문법, 기획 문서 제목과 내부 링크
npm run build  # 배포 가능한 정적 파일 → dist/
npm run preview
```

## 기획과 사이트 수정

1. `plan/01-service.md`에 서비스의 문제, 대상, 목표를 적습니다.
2. 요구사항과 화면, 작업 순서를 나머지 기획 문서에 구체화합니다.
3. `src/`에서 실제 화면과 기능을 구현합니다. `plan/*.md`의 문서 내용은 사이트 문서 화면에 자동으로 반영됩니다.
4. 검증한 뒤 `main`에 커밋하고 푸시합니다.

```sh
npm run check
npm run build
git add plan src
git commit -m "Describe the service change"
git push origin main
```

설정이나 의존성을 바꾼 경우 해당 파일과 `package-lock.json`도 함께 커밋합니다. `dist/`와 `node_modules/`는 main에 커밋하지 않습니다. 저장할 때마다 자동 커밋하는 방식은 아니며, 완료한 변경을 main에 푸시하면 자동 배포됩니다.

## 배포

```text
plan/ + src/ 수정
       ↓
main 커밋 · 푸시
       ↓
GitHub Actions: npm ci → check → build
       ↓
dist/를 Actions 아티팩트로 전달
       ↓
GitHub Pages 배포
```

main의 소스를 GitHub Actions가 빌드하고 공식 Pages 액션으로 직접 배포합니다. 빌드 결과를 저장하는 별도 브랜치나 PAT 시크릿은 필요하지 않습니다. 평소에는 main에 커밋하고 푸시하면 됩니다.

이 저장소의 Pages Source는 **GitHub Actions**입니다. 다른 저장소로 복사할 때는 **Settings → Pages → Build and deployment → Source**에서 같은 값을 선택합니다. 워크플로의 `github-pages`는 배포 환경 이름입니다.

실패 시 [Actions](https://github.com/rosagkim/travel/actions)에서 실패한 단계를 확인합니다. 검증 또는 빌드가 실패하면 기존 배포가 유지됩니다. Pages 환경에 별도 승인 규칙이 있다면 자동 배포가 해당 규칙을 따릅니다.

Pages가 비활성화되어 `Failed to create deployment (status: 404)`가 발생하면 위 Source 설정을 완료한 뒤 Actions의 **Build and deploy → Re-run failed jobs**를 실행합니다. 이 경우 이미 성공한 빌드를 다시 수행하지 않고 배포 단계만 재시도합니다.

## 구조

```text
plan/                  서비스 기획 마크다운 (사이트에도 공개)
src/                   화면, 스타일, 서비스 설정
public/                파비콘과 정적 파일
scripts/               기획 문서 검증
.github/workflows/     검증 및 GitHub Pages 자동 배포
AGENTS.md              이후 작업 시 따를 기획·수정·배포 규칙
```

Vite + JavaScript 기반이며 경로는 해시 라우팅을 사용해 GitHub Pages의 하위 경로에서도 새로고침할 수 있습니다. GitHub Pages는 정적 호스팅입니다. 로그인, 서버, 영구 데이터 저장이 필요해지면 별도 API와 저장소를 기획합니다.
