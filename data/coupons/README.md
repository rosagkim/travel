# 음식점 쿠폰 초기 데이터

`naver-food.seed.json`은 실사용이 검증된 쿠폰 목록이 아니라 공개 출처에서 발견한 후보이다. 조사 근거와 접근 한계는 [조사 기록](../../plan/research/naver-food-2026-10-29.md)에 있다.

## 필드와 검수

- `source`: 제공처, 매장·쿠폰·프로모션 ID, 발견 출처, 원본 쿠폰 링크, 목록 확인 시각과 원문 값. 식별자는 문자열로 저장한다.
- `merchant`: 원문 매장명·언어, 정규화 업종·원문 업종, 도시·구·동네, 좌표, 상세 주소, 원본 매장 링크. 좌표는 원본 값이며 상세 주소나 영업 상태 검증을 의미하지 않는다.
- `benefit`: 제목 원문과 언어, 혜택 유형, 검수한 금액·할인율·요약. 증정품 가격을 할인액으로 저장하지 않는다.
- `validity`: `unknown`, `fixed`, `relative`. 고정 기한은 시간대가 포함된 ISO 시각을 쓰며 `endsAt`은 사용 가능 구간의 끝(미포함)이다. 예를 들어 10월 31일까지라면 한국 시간 11월 1일 00:00을 사용한다. 상대 기한은 `daysAfterIssue`와 원문 조건을 함께 검수하며 개별 이용자의 발급일은 수집하지 않는다.
- `conditions`: 받는 조건과 쓰는 조건, 최소 결제액, 대상 메뉴, 요일·시간, 중복 사용 조건. 미확인 값은 `null`이다. 확인된 제한 없음은 검수한 설명으로 명시한다.
- `travelerRequirements`: 네이버 계정·한국 전화번호·본인인증 각각 `unknown`, `required`, `not-required`. 결제 요건 설명과 사용 대상 판정(`unknown`, `eligible`, `ineligible`)은 출처에 근거해 검수한다.
- `redemption`: 원본 사용 경로와 검수한 단계. 목록의 `ALL`은 검수한 모든 사용 경로를 의미하지 않아 `unknown`으로 둔다. `BOOKING`만 예약 경로로 보존한다.
- `review`: `needs-review`, `verified`, `expired`, `unavailable`. `checkedAt`과 상세 근거 URL은 목록 확인 시각과 구분한다.

`src/lib/coupons.mjs`가 필수 구조와 중복을 검사한다. `publicationIssues()`는 상세 검수·기한·사용 안내·외국인 요건·검수 최신성을 확인한다. 공개 목록을 만드는 후속 구현은 반드시 이 검사를 통과한 데이터만 사용해야 한다. 전화번호 필요 여부 등을 알 수 없다는 이유로 무조건 외국인 사용 불가로 판단하지 않는다.

초기 설정은 [coupon-bootstrap.json](../../config/coupon-bootstrap.json)에 있다. 수집 상태를 점검하려면 `npm run coupons:check`를 실행한다. 이 명령은 네트워크 요청, 발급·사용, 자동 수집을 수행하지 않는다.
