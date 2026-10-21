# 운영 도메인과 네이버 소유확인

작업일: 2026-10-21

- 운영 도메인: `https://tstudymate.com`.
- 홈페이지: `https://tstudymate.com/`.
- 지역 예: `https://tstudymate.com/reg-yongsangu/`.
- 역 예: `https://tstudymate.com/st-seomyun/`.
- 사이트맵: `https://tstudymate.com/sitemap.xml`.
- 수집 정책: `https://tstudymate.com/robots.txt`.
- 네이버 소유확인 파일: `https://tstudymate.com/naver686492ec587065ddaf1ebc2627b5b46f.html`.

## 적용 내용

사용자가 GitHub 설정에서 추가한 `CNAME` 커밋을 먼저 가져와 그대로 유지했다. HTTP 요청이 HTTPS로 이동하고 HTTPS 홈페이지가 정상 응답하는 것을 확인한 뒤 HTTPS를 대표 주소로 설정했다. `data/site.json`의 `origin`은 `https://tstudymate.com`, `basePath`는 빈 문자열이다. 기존 GitHub Pages의 `/power` 경로를 새 도메인에 붙이지 않는다.

콘텐츠·목록 500개의 canonical·Open Graph URL과 기존 주소 이동 파일의 canonical은 모두 운영 도메인을 사용한다. 일반 페이지는 `index,follow`로 바꾸고 기존 주소 이동 파일의 `noindex,follow`는 유지한다. `robots.txt`는 수집을 허용하고 새 도메인의 사이트맵을 안내한다. 사이트맵에는 콘텐츠·목록 500개만 포함하고 이동 파일과 소유확인 파일은 넣지 않는다. 수집 허용이 실제 색인이나 순위를 보장하지는 않는다.

## 네이버 파일 보존

사용자가 제공한 원본 HTML 확인 파일을 루트에 바이트 단위로 복사했다. 템플릿을 적용하거나 본문·인코딩·줄바꿈을 고치지 않았다. `.gitattributes`에서 이 파일의 줄바꿈 변환을 막아 Git에 올릴 때도 원본을 유지한다. 생성·패키징 과정에는 `CNAME`과 이 확인 파일을 포함하므로 다음 재생성 때 빠지지 않는다. 소유확인 후에도 재확인에 필요할 수 있으므로 임의로 삭제하지 않는다.

네이버 화면의 등록 주소가 `http://tstudymate.com`이어도 이 서버의 HTTP 요청은 HTTPS로 이동한다. 두 프로토콜에서 동일한 파일에 도달하는지 배포 후 확인한다. 파일 업로드와 네이버의 최종 소유확인 완료는 별개이며, 소유확인 버튼 클릭은 사용자 화면에서 진행한다. [네이버 공식 안내](https://help.naver.com/service/30010/contents/17584?lang=ko&osType=PC).

## 재생성

```powershell
node scripts/generate-regions.cjs
node --test scripts/test-stations.cjs scripts/test-routes.cjs
python scripts/check-generated.py
```

루트의 `sitemap.xml`과 `robots.txt`도 이 생성 명령에서 갱신한다. 별도 ZIP을 만들지 않아도 GitHub Pages 배포에 포함된다. `publicFiles` 목록에 확인 파일·CNAME·수집 지원 파일을 기록하고 누락을 검사한다.
