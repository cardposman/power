# 영어수업 확장

영어 상품명은 **맨투맨영어회화**, 사이트명은 **TS맨투맨회화**다. 승인된 용산구 샘플의 구성·이미지·전화/화상수업·혜택 안내를 확장했다. 영어 상담은 `https://naver.me/FCZLglsi`를 사용하고 일본어 상담 링크는 유지한다.

## 페이지 수

| 구분 | 영어 페이지 |
|---|---:|
| 대표 | 1 |
| 시·군·구 상세 | 269 |
| 지역 목록: 전국 1 + 권역 16 | 17 |
| 역 상세 | 200 |
| 역 목록: 전국 1 + 권역 12 | 13 |
| 합계 | **500** |

기존 일본어 504페이지와 합쳐 **1,004개 canonical 페이지**다. 기존 주소 호환용 리다이렉트 469개는 별도이며 콘텐츠 페이지 수에 포함하지 않는다. 영어 학습 과정은 샘플처럼 탭으로 제공하고 독립 카테고리 4페이지를 추가하지 않았다.

## 소스와 공개 주소

| 저장소 파일 | 공개 경로 |
|---|---|
| `english/index.html` | `/english/` |
| `english/region/seoul/11170/index.html` | `/en-reg-yongsangu/` |
| `english/station/busan/147/index.html` | `/en-st-seomyun/` |
| `english/region/index.html` | `/english/region/` |
| `english/station/busan/index.html` | `/english/station/busan/` |

기존 슬러그 표를 재사용하므로 동명 지역·역의 구분도 유지된다. 짧은 경로의 폴더는 `_site/`에만 생성한다. 저장소 원본은 `english/region/{권역}/{코드}/`, `english/station/{권역}/{ID}/`로 유지한다. 새 영어 페이지는 기존에 공개된 주소가 없어 별도 구주소 리다이렉트를 만들지 않는다.

일본어 제목·본문·상담 주소는 유지하고 헤더에 영어수업 진입 링크를 추가했다. 영어에서는 대표 페이지와 목록을 거쳐 각 상세 페이지에 접근할 수 있고 푸터에서 일본어로 이동할 수 있다. 검색기능이나 지역·역 상담 상단 메뉴를 다시 추가하지 않았다.

## 지역명과 문구

지역 269곳과 역 200곳은 `data/english-copy/`에 각각 작성한 제목·본문·준비 질문 3개를 가진다. 각 행은 `지역코드 또는 역ID|제목|본문|질문1/질문2/질문3` 형식이다. 소수의 본문을 해시로 배정하는 6종 템플릿 방식은 제거했다. `scripts/english-local-content.cjs`는 해당 페이지의 원고만 읽으며 누락·중복·관할 불일치가 있으면 생성에 실패한다. 행의 정렬 순서는 페이지 배정에 영향을 주지 않는다. 용산구의 동명은 한남동·이촌동·후암동으로 유지한다.

본문은 지역명 삽입 전에도 469개가 모두 다르다. 제목 469개와 질문 묶음 469개도 따로 작성했다. 글 뒤의 지역·서비스 문맥과 상품 이미지·기본 과정·FAQ 등은 공통 구성으로 유지한다. 원고의 학습 상황은 상담 예시이며 해당 지역의 실제 수요나 인구 특성을 확인한 결과가 아니다. 원고 중복 검사와 5글자 조각의 겹침 검사는 자체 회귀 검사이고 네이버·구글의 판별 알고리즘을 재현하지 않는다.

다른 지역은 실제 관할 법정 읍·면·동 중 공공 학교 주소자료에 나타나는 건수를 참고해 최대 3곳을 선정했다. 학교가 많은 곳의 예시를 선택한 것이며 인구·검색수요 상위 3곳이라는 주장을 하지 않는다. **부산 연제구는 연산동·거제동, 충북 증평군은 증평읍·도안면 두 곳뿐이므로 2개만 사용한다.** 넓은 시 단위에서는 하위 구 안의 동도 해당 시 관할로 포함한다.

역 페이지의 3곳은 공식 역사 좌표와 같은 시·도 내 학교 주소 기준점을 이용해 가까운 서로 다른 법정 지역을 선정했다. 학교 주소의 위치는 동 경계·중심점이 아니므로 이는 생활권 참고 예시이며 도보 거리나 엄밀한 역세권 범위를 뜻하지 않는다. 홈페이지에 거리 수치나 역 소재지 주소를 표시하지 않는다. 오프라인 교실이 있다는 표현도 사용하지 않는다.

동명은 상담 문단에 한 묶음으로 한 번 넣고 제목·H1·메타설명에는 추가하지 않는다. 공통 상품 이미지·과정·FAQ는 유지되므로 페이지별 완전히 독립적인 상품이나 검색엔진의 중복문서 판단 회피를 보장하는 것은 아니다.

## 근거 자료와 재생성

- [행정표준코드관리시스템 법정동코드](https://www.code.go.kr/stdcode/regCodeL.do): 현존 코드와 관할을 대조했다. 원자료의 앞뒤 공백을 제거해 비교한다.
- [국가철도공단 철도산업정보센터 전국 역사정보](https://data.kric.go.kr/rips/M_01_01/detail.do?id=1294): 2026년 제공 파일. 행별 기준일은 다를 수 있다.
- [전국도시철도역사정보 표준데이터](https://www.data.go.kr/data/15013205/standard.do): 좌표 대조용. 현재 역사정보와 0.8km 이상 다른 14건을 기록했고 13건은 표준데이터 좌표를 대략적 참고 위치로 사용한다. 남광주는 현재 자료의 학동 주소와 맞는 현재 좌표를 사용한다. 정밀 위치 검증이나 길찾기용 데이터가 아니다.
- [교육환경정보시스템 공공데이터](https://schoolzone.emac.kr/publicData/publicDataList.do): 2026-03-20 학교 주소·좌표 스냅샷. 초기 가져오기에만 HowCoding의 보관 자료를 읽었으며 이 프로젝트의 재생성은 그 폴더에 의존하지 않는다.

`data/english-places.json`에 선택 지역·역 좌표·주소 기준점·자료 해시·선정 방법·좌표 차이 내역을, `data/english-area-codes.json`에 관할 대조용 코드표를 저장한다. 법정 지역명이 3개 미만인 경우와 주소자료 시차도 보존한다. 지도·행정 경계 서비스 수준의 정확성을 주장하지 않는다.

일상 생성·배포는 네트워크나 원자료 다운로드 없이 저장된 JSON만 사용한다. 원자료 갱신 시에는 `scripts/import-english-places.py --help`의 입력 파일을 명시해 다시 가져오고 차이를 검토한다. 원본 다운로드 파일은 ignored `verification/research/`에만 보관한다.

```powershell
node scripts/generate-regions.cjs
node --test scripts/test-english-local-content.cjs scripts/test-english-pages.cjs
python scripts/check-generated.py
python scripts/check-english-pages.py
node scripts/build-pages.cjs
python scripts/check-generated.py --directory _site
python scripts/check-english-pages.py --directory _site
# 로컬 Playwright 런타임
node scripts/check-english-sample.cjs
node scripts/check-english-browser.cjs
node scripts/check-routes.cjs
```

`generate-english-sample.cjs`와 `check-english-sample.py`는 이제 전체 확장 생성·검사로 연결되는 호환 명령이다. 브라우저 샘플 검사 `.cjs`는 용산구 화면을 계속 확인한다. 원본 영어 이미지 1개와 WebP 조각 6개는 모든 영어 페이지가 공유한다.

`data/english-collection-urls.txt`에는 영어 상세 지역 269개 다음 역 200개, 이후 대표·목록 31개의 절대 URL을 기록한다. 기존 `collection-urls.txt`는 수정하지 않는다. 커밋·푸시하면 기존 GitHub Actions가 1,004페이지를 빌드·배포하며, 로컬 생성만으로 서버가 변경되지는 않는다.
