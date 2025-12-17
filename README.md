# BoardProject Frontend (React + Vite)

게시판 프로젝트 프론트엔드입니다. **개발 환경에서는 Vite 프록시(`/api`)를 통해 백엔드로 요청**하고, 운영 환경에서는 **`VITE_API_URL`을 통해 직접 백엔드로 요청**합니다.

## 프로젝트 실행 방법

### 프론트 실행

```bash
npm install
npm run dev
```

- 기본 접속: Vite가 출력하는 Local URL (예: `http://localhost:5173`)

### 백엔드(로컬)와 함께 실행 전제

- 기본 전제: 백엔드가 `http://localhost:8080`에서 실행 중
- 다른 포트를 쓰면 아래 **환경변수**의 `VITE_DEV_API_URL`로 바꾸세요.

## 필수 env

이 프로젝트는 `.env` 파일이 없어도 **로컬 개발은 동작**하도록 구성되어 있습니다(기본값 사용).

### 개발(DEV)

- **`VITE_DEV_API_URL` (선택)**: dev에서 Vite 프록시가 붙을 백엔드 주소
  - 기본값: `http://localhost:8080`
  - 예) 백엔드가 8081이면 `VITE_DEV_API_URL=http://localhost:8081`

예시 파일: `.env.development.local`

```env
VITE_DEV_API_URL=http://localhost:8080
```

### 운영(PROD)

- **`VITE_API_URL` (필수)**: 운영에서 프론트가 직접 호출할 백엔드 Base URL

예시 파일: `.env.production.local`

```env
VITE_API_URL=https://api.example.com
```

## 아키텍처

### 요청 흐름(중요)

- **개발(DEV)**:
  - 브라우저 → `http://localhost:<vite_port>/api/...`
  - Vite Dev Server Proxy → `VITE_DEV_API_URL`(기본 `http://localhost:8080`) → 백엔드
  - 장점: 브라우저 CORS 이슈를 피함
  - 관련 파일: `vite.config.js`, `src/api/axios.js`

- **운영(PROD)**:
  - 브라우저 → `VITE_API_URL + /api/...` → 백엔드
  - 관련 파일: `src/api/axios.js`

### 인증(토큰) 흐름

- Access Token은 `localStorage.accessToken`
- Refresh Token은 `localStorage.refreshToken`
- 모든 API 요청에 `Authorization: Bearer <accessToken>` 자동 첨부
- 401 발생 시 `/api/user/refresh`로 토큰 갱신 시도 후 원 요청 재시도
  - 403은 재발급 시도 없이 즉시 실패 처리
  - 관련 파일: `src/api/axios.js`

### 폴더 구조(요약)

- **`src/api/`**: axios 클라이언트 및 API 모듈(`post.js`, `admin.js`, `auth.js` 등)
- **`src/pages/`**: 라우팅 단위 페이지
- **`src/components/`**: 재사용 UI 컴포넌트
- **`src/context/`**: 전역 상태/인증 컨텍스트 (`AuthContext.jsx`)

## 트러블슈팅

### “Provisional headers are shown” / 프록시 에러(ETIMEDOUT/ECONNREFUSED)

- **원인**: dev 프록시 타겟이 잘못되었거나 백엔드가 내려가 있음
- **해결**
  - 백엔드가 실제로 실행 중인지 확인(`http://localhost:8080` 등)
  - 백엔드 포트가 다르면 `VITE_DEV_API_URL`을 설정
  - `npm run dev`를 여러 번 띄웠다면 모두 종료 후 하나만 실행


