# 지역·역별 짧은 주소 전환

작업일: 2026-10-21

도메인 연결 후 운영 주소는 `https://tstudymate.com`으로 전환했다. `/power` 접두사는 더 이상 사용하지 않으며, [도메인·소유확인 설정](domain-setup.md)을 함께 참고한다.

## 적용 범위

지역 상세 269개는 `reg-지역명/`, 역별 상세 200개는 `st-역명/` 형식으로 전환했다. 메인 1개와 목록 30개의 주소는 그대로다. 제목·상담 내용·학교명·썸네일 배정은 바꾸지 않았다.

| 항목 | 기존 경로 | 새 경로 |
| --- | --- | --- |
| 서울 용산구 | `/power/region/seoul/11170/` | `https://tstudymate.com/reg-yongsangu/` |
| 부산 서면역 | `/power/station/busan/147/` | `https://tstudymate.com/st-seomyun/` |
| 서울 중구 | `/power/region/seoul/11140/` | `https://tstudymate.com/reg-seoul-junggu/` |
| 부산 중구 | `/power/region/busan/26110/` | `https://tstudymate.com/reg-busan-junggu/` |
| 대구 중앙로역 | `/power/station/daegu/168/` | `https://tstudymate.com/st-daegu-jungangno/` |
| 대전 중앙로역 | `/power/station/daejeon/183/` | `https://tstudymate.com/st-daejeon-jungangno/` |

서면은 요청받은 `seomyun` 표기를 그대로 사용했다. 영문 슬러그는 주소용 식별자이며 공식 영문 역명·행정명 표기임을 보장하는 자료가 아니다.

## 중복과 관리 방식

`data/route-slugs.json`에 모든 지역 코드와 역 후보 번호에 대응하는 주소를 명시적으로 저장한다. 같은 이름의 구·군·역은 광역명을, 도시 아래 일반구는 도시명을 함께 넣었다. 새 항목을 추가할 때 기존 주소가 자동으로 달라지지 않도록 이름으로 즉석 변환하지 않는다. 누락·중복·공백·한글·경로 구분자·쿼리가 섞인 슬러그는 생성 전에 오류로 처리한다.

저장소와 로컬에서는 **원래의 분류 폴더를 유지**한다. `region/광역명/지역코드/index.html`, `station/광역명/역번호/index.html`에 이동 안내가 아닌 실제 상세페이지를 저장한다. 루트에 `reg-*`, `st-*` 폴더를 저장하지 않는다. 템플릿과 데이터도 기존 위치에서 관리한다.

`node scripts/generate-regions.cjs`는 이 분류 구조의 **콘텐츠·목록 504개**만 재생성한다. `node scripts/build-pages.cjs`는 별도로 Git에서 제외된 `_site/`에 짧은 공개 경로를 생성한다. 이 배포 결과에만 콘텐츠·목록 504개와 이전 주소 이동 파일 469개가 들어간다. GitHub Actions는 `_site/`만 업로드하며 생성물을 저장소에 다시 커밋하지 않는다.

| 구분 | 용산구 | 서면역 |
| --- | --- | --- |
| 저장소·로컬 원본 | `region/seoul/11170/index.html` | `station/busan/147/index.html` |
| 배포 결과물 | `_site/reg-yongsangu/index.html` | `_site/st-seomyun/index.html` |
| 실제 접속 주소 | `https://tstudymate.com/reg-yongsangu/` | `https://tstudymate.com/st-seomyun/` |

GitHub Pages가 게시하는 **배포 결과물의 경로**는 URL과 대응하지만, **저장소 원본 폴더 구조**까지 같을 필요는 없다. Pages 설정의 배포 소스는 `GitHub Actions`를 사용한다. `Deploy from a branch`로 원본을 직접 게시하면 안 된다. 전환할 때는 먼저 Actions 배포로 설정한 뒤 이 구조의 커밋을 푸시하여 원본이 곧바로 게시되는 일을 막는다.

## 기존 주소 호환

배포 사이트의 기존 상세 주소는 새 주소로 자동 이동한다. 배포된 내부 링크는 짧은 주소를, 로컬 원본의 내부 링크는 분류 폴더를 가리킨다. 이동 파일은 배포 결과물에만 생성한다. 이전 공개 경로로 접속하면 JavaScript가 새 경로로 이동하면서 쿼리와 앵커를 유지한다. JavaScript를 끈 경우에는 `noscript` 새로고침과 이동 링크가 남는다. 이 대체 경로는 `index.html`로 열릴 수 있으며 쿼리·앵커 보존은 JavaScript 경로에서 검증했다.

이는 **GitHub Pages에서 동작하는 HTML·브라우저 이동**이지 서버의 HTTP 301 응답을 설정한 것이 아니다. 기존 주소에는 `noindex,follow`를 지정하고, 운영 origin이 설정된 생성에서는 새 주소를 canonical로 지정한다. 구 경로를 포함하는 별도 서버 규칙이나 커스텀 404 우회는 사용하지 않는다.

GitHub Pages 정적 파일 배포를 위한 `.nojekyll`도 포함한다. [GitHub 공식 정적 파일 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## 프로젝트 하위 경로와 색인

`data/site.json`의 `origin`은 `https://tstudymate.com`, `basePath`는 빈 문자열이다. 운영용 canonical·Open Graph·사이트맵 URL은 `origin + basePath + route`로 생성한다. 내부 링크와 이미지 경로는 상대 경로이므로 도메인 루트에서 작동한다. 웹에서는 끝이 `/`인 짧은 경로를 사용하고, `file://` 미리보기에서는 공유 스크립트가 이동 링크에 `index.html`을 붙인다.

운영 도메인 origin과 프로젝트 경로는 분리한다:

```powershell
$env:SITE_ORIGIN = 'https://tstudymate.com'
$env:SITE_BASE_PATH = '/'
node scripts/generate-regions.cjs
```

`SITE_ORIGIN`에는 경로를 포함하지 않는다. 최초 짧은 주소 작업 때는 검토용 색인 차단을 유지했지만, 사용자 요청에 따른 실제 도메인·서치어드바이저 연결 이후에는 운영 페이지의 색인을 허용한다. 기존 주소 이동 파일은 계속 `noindex,follow`다.

배포 패키지를 명시적으로 요청해 생성할 때에는 새 페이지와 이전 주소 이동 파일, 네이버 소유확인 파일 등 루트 지원 파일을 모두 포함한다. 사이트맵에는 콘텐츠·목록 504개만 넣고 이동용 주소와 소유확인 파일은 제외한다. ZIP은 별도 요청 전에는 생성하지 않는다.

## 확인 방법

```powershell
node scripts/generate-regions.cjs
node --test scripts/test-stations.cjs scripts/test-routes.cjs scripts/test-layout.cjs
python scripts/check-generated.py
node scripts/build-pages.cjs
python scripts/check-generated.py --directory _site
```

브라우저 검사에는 기존 메인·지역·역 스크립트와 `scripts/check-routes.cjs`를 사용한다. 새 경로 검사는 Git에서 제외된 `verification/deployment-*`에 도메인 루트 구조의 별도 사본을 생성하고 임시 로컬 HTTP 서버로 검증한다. 검증 자체는 원본의 설정이나 GitHub 저장소를 바꾸지 않는다. 검사가 끝나면 서버를 닫는다. 구조 회귀 검사는 반복 빌드 후 원본 504개와 지원 파일의 해시가 변하지 않았는지, 루트에 짧은 주소 폴더가 다시 생기지 않았는지도 확인한다.

검증 범위는 504개 콘텐츠·목록 및 469개 이동 파일의 응답·경로, 대표 지역·역의 PC/모바일 화면, 동일 이름의 목적지 구분, 기존 주소의 슬래시·`index.html` 변형, 쿼리·앵커 유지, JavaScript 미사용 대체 경로, 로컬 파일 열기 및 실제 목록 클릭이다. 원격 GitHub Pages 배포가 완료되었다는 확인과는 구분한다.
