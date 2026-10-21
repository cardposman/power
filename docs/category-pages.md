# 학습 목적별 카테고리

## 페이지 구성

| 메뉴 | 원본 파일·공개 경로 | 핵심 내용 |
| --- | --- | --- |
| 일본어자격증 | `course/jlpt/index.html` · `/course/jlpt/` | JLPT 목표 급수, 영역별 준비, 오답 복습 |
| 여행회화 | `course/travel/index.html` · `/course/travel/` | 식당·교통·숙소·쇼핑 상황과 듣고 확인하기 |
| 비즈니스회화 | `course/business/index.html` · `/course/business/` | 경어, 업무 연락, 회의, 일정 변경 요청 |
| 성인취미 | `course/hobby/index.html` · `/course/hobby/` | 성인 입문·재시작, 관심사 회화, 지속 가능한 복습 |

각 페이지에 대상별 고민, 네 가지 학습 내용, 세 단계 연습 예시, 네 항목 상담 준비, 네 가지 FAQ와 다른 과정 링크를 담았다. 연습 예시는 편집상 제안이며 확정된 수업 운영 조건이나 결과 보장이 아니다. 수강료·수업 시간·자료 활용 조건은 상담에서 확인하도록 안내한다. 기존 네이버 상담 링크는 그대로 사용한다.

전 페이지 상단 메뉴의 지역별 상담 링크를 제거하고 네 카테고리를 연결한다. 기존 학습 과정·커리큘럼·FAQ의 페이지 내 링크는 유지한다. 지역·역 목록과 기존 상세페이지는 삭제하지 않으며 푸터 링크로 접근할 수 있다.

## 원본과 배포

카테고리는 `data/categories.json`, `templates/category.html`, `scripts/category-pages.cjs`에서 관리하며 기존 생성 명령으로 함께 생성한다. 로컬과 저장소의 `region/`, `station/` 분류 구조 및 배포물만 짧은 주소로 생성하는 방식은 바꾸지 않았다. 카테고리 자체는 원본과 배포 경로가 같다.

전체 콘텐츠·목록 페이지는 기존 500개에 카테고리 4개를 더한 504개다. 사이트맵에 새 페이지도 포함하며 이전 주소 이동 파일 469개는 계속 제외한다. 수집 요청용 `collection-urls.txt`에도 네 URL을 추가했다.

## 자료와 표현

새 페이지의 시각 자료는 제공된 `product-detail` 이미지 중 관련 교재 안내 영역을 CSS로 표시한다. 원본 이미지를 수정하거나 새로운 교재 표지·후기를 만들지 않았다. 전체 이미지 보기 링크도 제공한다.

JLPT의 5개 수준과 말하기·쓰기를 직접 평가하지 않는다는 설명은 [JLPT 공식 개요](https://jlpt.jp/sp/e/about/points.html)를 참고했다. 시험 일정·응시료·취득 소요 기간은 임의로 적지 않는다. 여행·업무·취미 페이지의 상황별 연습은 자체 작성한 학습 제안이며 개인별 제공 범위는 상담에서 확인한다.

## 확인

```powershell
node scripts/generate-regions.cjs
node --test scripts/test-stations.cjs scripts/test-routes.cjs scripts/test-layout.cjs scripts/test-categories.cjs
python scripts/check-generated.py
node scripts/build-pages.cjs
python scripts/check-generated.py --directory _site
```

Playwright 환경에서는 `scripts/check-categories.cjs`와 `scripts/check-categories.cjs --directory _site`로 원본·배포물의 네 페이지, 320·390·1440px 화면, 메뉴 이동, FAQ, 이미지, 가로 넘침과 JavaScript 오류를 검사한다. `scripts/check-routes.cjs`는 배포 HTTP 경로와 JavaScript를 끈 카테고리 간 이동도 검사한다.
