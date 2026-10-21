# 지역·역별 짧은 주소 전환

작업일: 2026-10-21

## 적용 범위

지역 상세 269개는 `reg-지역명/`, 역별 상세 200개는 `st-역명/` 형식으로 전환했다. 메인 1개와 목록 30개의 주소는 그대로다. 제목·상담 내용·학교명·썸네일 배정은 바꾸지 않았다.

| 항목 | 기존 경로 | 새 경로 |
| --- | --- | --- |
| 서울 용산구 | `/power/region/seoul/11170/` | `/power/reg-yongsangu/` |
| 부산 서면역 | `/power/station/busan/147/` | `/power/st-seomyun/` |
| 서울 중구 | `/power/region/seoul/11140/` | `/power/reg-seoul-junggu/` |
| 부산 중구 | `/power/region/busan/26110/` | `/power/reg-busan-junggu/` |
| 대구 중앙로역 | `/power/station/daegu/168/` | `/power/st-daegu-jungangno/` |
| 대전 중앙로역 | `/power/station/daejeon/183/` | `/power/st-daejeon-jungangno/` |

서면은 요청받은 `seomyun` 표기를 그대로 사용했다. 영문 슬러그는 주소용 식별자이며 공식 영문 역명·행정명 표기임을 보장하는 자료가 아니다.

## 중복과 관리 방식

`data/route-slugs.json`에 모든 지역 코드와 역 후보 번호에 대응하는 주소를 명시적으로 저장한다. 같은 이름의 구·군·역은 광역명을, 도시 아래 일반구는 도시명을 함께 넣었다. 새 항목을 추가할 때 기존 주소가 자동으로 달라지지 않도록 이름으로 즉석 변환하지 않는다. 누락·중복·공백·한글·경로 구분자·쿼리가 섞인 슬러그는 생성 전에 오류로 처리한다.

학교 자료와 역 후보 자료는 기존처럼 `data/`에서 분류해 관리한다. 기존 `region/`, `station/` 폴더에는 목록과 이전 주소 호환 파일을 남겼다. GitHub Pages의 현재 정적 파일 방식에서 짧은 경로로 직접 접속할 수 있도록 새 `reg-*`, `st-*` 폴더의 `index.html`을 생성한다. 이 파일들은 수작업 편집 원본이 아니며 템플릿·데이터에서 재생성한다.

따라서 **상품·목록 콘텐츠는 여전히 500페이지**다. 별도로 **469개의 이전 주소 이동 파일**이 생겨 물리적인 HTML 파일 수는 969개다. 이전 주소 파일을 독립적인 상품 페이지나 검색 유입용 추가 원고로 세지 않는다.

## 기존 주소 호환

기존 상세 주소는 새 주소로 자동 이동한다. 새 내부 링크는 처음부터 짧은 주소를 가리킨다. 이전 경로로 접속한 경우 JavaScript가 새 경로로 이동하면서 쿼리와 앵커를 유지한다. JavaScript를 끈 경우에는 `noscript` 새로고침과 이동 링크가 남는다. 이 대체 경로는 `index.html`로 열릴 수 있으며 쿼리·앵커 보존은 JavaScript 경로에서 검증했다.

이는 **GitHub Pages에서 동작하는 HTML·브라우저 이동**이지 서버의 HTTP 301 응답을 설정한 것이 아니다. 기존 주소에는 `noindex,follow`를 지정하고, 운영 origin이 설정된 생성에서는 새 주소를 canonical로 지정한다. 구 경로를 포함하는 별도 서버 규칙이나 커스텀 404 우회는 사용하지 않는다.

GitHub Pages 정적 파일 배포를 위한 `.nojekyll`도 포함한다. [GitHub 공식 정적 파일 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## 프로젝트 하위 경로와 색인

`data/site.json`의 `basePath`는 `/power`다. 운영용 canonical·Open Graph·사이트맵 URL은 `origin + basePath + route`로 생성한다. 내부 링크와 이미지 경로는 상대 경로이므로 `/power/` 아래에서도 작동한다. 웹에서는 끝이 `/`인 짧은 경로를 사용하고, `file://` 미리보기에서는 공유 스크립트가 이동 링크에 `index.html`을 붙인다.

운영 도메인 origin과 프로젝트 경로는 분리한다:

```powershell
$env:SITE_ORIGIN = 'https://cardposman.github.io'
$env:SITE_BASE_PATH = '/power'
node scripts/generate-regions.cjs
```

다른 호스팅의 도메인 루트에 배포한다면 `SITE_BASE_PATH='/'`로 바꾼다. `SITE_ORIGIN`에는 `/power`를 포함하지 않는다. 위 운영용 명령은 색인을 활성화하므로 이번 로컬 기본 생성에는 사용하지 않았다. **기존 `origin: ""`와 기본 색인 차단은 유지했다.**

배포 패키지를 명시적으로 요청해 생성할 때에는 새 페이지와 이전 주소 이동 파일을 모두 포함한다. 사이트맵에는 콘텐츠·목록 500개만 넣고 이동용 주소는 제외한다. 이번 작업은 패키지 생성·커밋·푸시·서버 배포를 수행하지 않았다.

## 확인 방법

```powershell
node scripts/generate-regions.cjs
node --test scripts/test-stations.cjs scripts/test-routes.cjs
python scripts/check-generated.py
```

브라우저 검사에는 기존 메인·지역·역 스크립트와 `scripts/check-routes.cjs`를 사용한다. 새 경로 검사는 Git에서 제외된 `verification/short-routes-production`에 `/power` 운영 URL을 사용한 별도 사본을 생성하고 잠깐 실행하는 로컬 HTTP 서버로 검증한다. 원본의 색인 설정이나 GitHub 저장소는 바꾸지 않는다. 검사가 끝나면 서버를 닫는다.

검증 범위는 500개 콘텐츠·목록 및 469개 이동 파일의 응답·경로, 대표 지역·역의 PC/모바일 화면, 동일 이름의 목적지 구분, 기존 주소의 슬래시·`index.html` 변형, 쿼리·앵커 유지, JavaScript 미사용 대체 경로, 로컬 파일 열기 및 실제 목록 클릭이다. 원격 GitHub Pages 배포가 완료되었다는 확인과는 구분한다.
