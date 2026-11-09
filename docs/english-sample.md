# 영어 지역 샘플

초기 샘플은 서울 용산구 1페이지였으며, 현재는 승인된 샘플을 기준으로 영어 500페이지로 확장했다. 전체 구성과 주소는 [영어 확장 문서](english-expansion.md)를 참고한다. 상품명은 `맨투맨영어회화`, 사이트명은 기존 `data/site.json`을 사용한다. 영어수업 상담 링크는 `data/english.json.counselUrl`의 `https://naver.me/FCZLglsi`로 분리한다. 상담 버튼과 본문 이미지 마지막의 무료 레벨테스트 버튼에 모두 적용하며, 일본어 상담 링크 `https://naver.me/52c74Jj4`는 변경하지 않는다.

- 원본 페이지: `english/region/seoul/11170/index.html`
- 영어 콘텐츠 설정: `data/english.json`
- 전용 템플릿·스타일: `templates/english-lesson.html`, `assets/css/english.css`
- 원본 자료: `assets/originals/english/product-detail.png`
- 화면용 이미지: `assets/images/english/product-detail-1.webp`부터 6개

이미지는 제공된 원본 그대로 보존하고, 4096픽셀 높이 이하의 이어지는 WebP 이미지로 변환했다. 표시 중 빈틈이나 누락이 없도록 원본 좌표와 이미지 크기를 `data/english-image.json`에 기록한다. 이미지 마지막의 상담 버튼도 영어 전용 상담 링크로 연결한다. 무료 혜택은 원본에 나온 무료 레벨테스트로 안내하며 무료 체험레슨 등 다른 혜택을 임의로 추가하지 않는다.

현재 용산구 페이지는 `index,follow`이며 공개 canonical은 `https://tstudymate.com/en-reg-yongsangu/`다. 기본 생성·배포·사이트맵에 포함되며 일본어 504개와 영어 500개로 총 1,004페이지다.

상단은 기존 썸네일 중 수강 후기나 학생 성적을 주장하지 않는 맞춤 커리큘럼 이미지 4번을 사용한다. 지역명은 제목과 한 문단의 상담 안내로 한정하고, 이번 자료의 시험·취업·실무 목적에 맞춰 학교명 중심 문단은 사용하지 않았다. 1:1 전화·화상수업임을 명시하고 지역 오프라인 지점이 있는 것처럼 표현하지 않는다.

사용자 요청에 따라 학습 상담 문단에 한남동·이촌동·후암동을 각각 한 번씩 포함한다. 동명은 `data/english.json.sampleNeighborhoods`에서 관리하고 제목·H1·메타설명에는 추가하지 않는다. 관할 동명 확인 자료는 [서울시 행정동·법정동 명칭 자료](https://www.seoul.go.kr/seoul/autonomy_sub.do)이며, 이 세 동이 수요 상위 지역이라는 의미는 아니다. 동명 삽입이 검색 노출 확대나 유사문서 회피를 보장하지 않는다.

용산구를 포함한 지역·역 469페이지의 상담 안내는 `data/english-copy/`에 저장된 개별 원고를 사용한다. 6종 본문 반복 배정은 제거했으며 제목·본문·준비 질문 묶음은 지역명 삽입 전에도 각각 469개가 다르다. 용산구는 경력과 면접 자기소개를 다루는 개별 원고를 사용한다. 해당 학습 상황을 지역 수요로 주장하지 않는다. 상품 이미지·기본 학습 과정과 지역·서비스 문맥은 공통 구성으로 유지한다. 검색엔진의 유사문서 판단 회피는 보장하지 않는다.

과정 탭의 자료는 영어 페이지의 JSON에서 읽는다. `assets/js/site.js`의 기존 일본어 과정은 JSON이 없는 기존 페이지에서 그대로 사용한다. 상담 조건, 수강료, 강사 배정과 무료 레벨테스트 일정은 상담에서 확인하도록 한다. 이미지 속 후기를 별도의 검증된 실적으로 재작성하지 않는다.

```powershell
# 이미지 준비에만 Sharp가 필요하다.
node scripts/prepare-english-images.cjs "C:/Users/82108/Downloads/english_power.png"
node scripts/generate-english-sample.cjs
node --test scripts/test-english-local-content.cjs
python scripts/check-english-sample.py

# Playwright 런타임에서 실행한다.
node scripts/check-english-sample.cjs
```

PNG 원본에는 `파워잉글리쉬` 표기가 포함되어 있다. 이 이미지를 수정하지 않았으며 HTML 상품명은 사용자 지정인 `맨투맨영어회화`로 사용한다.
