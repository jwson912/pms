# PMS Vercel 배포 가이드

이 저장소는 Vue/Vite 기반 PMS 웹앱입니다.

## 배포 설정

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`
- 로그인 경로: `/login`

`vercel.json`에 SPA rewrite가 포함되어 있어 `/login`, `/admin/dashboard` 같은 라우터 경로로 직접 접근해도 `index.html`로 진입합니다.

## 관리 페이지 실행 URL

Vercel 배포가 완료되면 GitHub 저장소의 Website/Homepage에 아래 형식으로 실제 배포 URL을 등록합니다.

```text
https://<pms-vercel-domain>/login
```

Flowdesk 관리 페이지는 GitHub 저장소의 Homepage 값을 읽어 `pms` 프로젝트 실행 버튼에 사용합니다.
