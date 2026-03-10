# 📝 BoardProject Frontend

[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite)](https://vitejs.dev/)
[![React_Router](https://img.shields.io/badge/React_Router-7.10.1-CA4245?logo=reactrouter)](https://reactrouter.com/)
[![Axios](https://img.shields.io/badge/Axios-1.13.2-5A29E4?logo=axios)](https://axios-http.com/)

BoardProject의 프론트엔드 레포지토리입니다. React와 Vite를 기반으로 개발되었으며, 사용자 친화적인 UI/UX와 백엔드 API와의 원활한 인증 및 통신을 제공합니다. 개발 환경에서는 Vite 프록시(`/api`)를 통해 백엔드로 요청하고, 운영 환경에서는 `VITE_API_URL`을 통해 직접 백엔드로 API를 요청합니다.

---

## ✨ 주요 기능 (Key Features)

- **인증 및 인가 (Auth)**
  - JWT 토큰 (Access & Refresh) 기반 로그인 및 회원가입
  - Axios 인터셉터를 활용한 Access Token 자동 갱신
  - `ProtectedRoute` 컴포넌트를 이용한 안전한 라우팅 접근 제어
- **게시판 기능 (Post)**
  - 게시글 CRUD (조회, 작성, 수정, 삭제)
  - Typesense를 활용한 초고속 게시글 검색
  - 내가 쓴 글 모아보기 (`/posts/my`)
  - 게시글 좋아요(Reaction) 기능
- **댓글 및 반응 (Comment)**
  - 게시글 상세 페이지 내 댓글 작성 기능
- **신고 시스템 (Report)**
  - 사용자가 부적절한 게시글이나 댓글을 신고할 수 있는 전용 모달(`ReportModal`) 제공
- **사용자 프로필 (Profile)**
  - 사용자 정보 확인 및 프로필 수정
  - AWS S3 기반의 프로필 이미지 업로드 연동
- **관리자 기능 (Admin)**
  - 관리자 전용 대시보드 및 페이지 제공 (`/admin`)

---

## 🛠 기술 스택 (Tech Stack)

### Core
- **React (19.2.0)**: UI 개발을 위한 핵심 라이브러리
- **Vite (7.2.4)**: 매우 빠른 프론트엔드 빌드 툴
- **React Router DOM (7.10.1)**: SPA 라우팅 처리

### Network API
- **Axios (1.13.2)**: Promise 기반의 백엔드 HTTP 비동기 통신

### Code Quality & Config
- **ESLint (9.39.1)**: 코드 린팅 (Flat Config)
- **CSS3**: 컴포넌트별 분리된 CSS 모듈 (예: `Home.css`, `Login.css` 등) 사용

---

## 📁 디렉토리 구조 (Directory Structure)

```text
board-front/
├── 📂 public/        # 정적 파일 (index.html, 로고 등)
├── 📂 src/
│   ├── 📂 api/       # 백엔드 API 모듈 (axios.js, auth.js, post.js, admin.js 등)
│   ├── 📂 assets/    # 폰트, 이미지 등 전역 정적 자원
│   ├── 📂 components/# 재사용 가능한 UI 컴포넌트 및 라우팅 가드
│   │   ├── Button.jsx, Input.jsx, Textarea.jsx
│   │   ├── Layout.jsx, ErrorNotice.jsx, ReportModal.jsx
│   │   └── ProtectedRoute.jsx
│   ├── 📂 context/   # React Context API (AuthContext.jsx)
│   ├── 📂 pages/     # URL 라우팅 단위 페이지 컴포넌트
│   │   ├── Home, Login, Signup, Profile, Admin 등
│   │   └── PostList, PostDetail, PostWrite, PostEdit 등
│   ├── 📂 styles/    # 전역 스타일 및 디자인 시스템 (선택적)
│   └── 📂 utils/     # 공통 유틸리티 (error.js, logger.js)
├── 📄 package.json
└── 📄 vite.config.js
```

---

## 🚀 로컬 환경 실행 방법 (How to Run Local)

### 1. 백엔드 실행 전제 조건
프론트엔드를 정상적으로 개발/구동하기 위해서는 백엔드가 아래 조건으로 실행 중이어야 합니다:
- **Spring Boot 서버**: `http://localhost:8080` (또는 지정된 프록시 포트)
- **Database / Cache**: MySQL, Redis 구동 완료
- **Search Engine**: Typesense 구동 완료 (검색 테스트 시 필요)
- **AWS S3**: .env 연동 완료 (파일 관리를 위한 경우)

### 2. 패키지 설치 및 실행
```bash
# 1. 의존성 패키치 설치
npm install

# 2. 로컬 개발 환경 서버 구동
npm run dev
```

> **Note**: Vite 구동 시 터미널에 표시되는 URL (기본값: `http://localhost:5173`)로 브라우저에서 접속합니다.

---

## ⚙️ 환경 변수 설정 (Environment Variables)

이 프로젝트는 `.env` 파일이 없어도 기본값(`http://localhost:8080`)을 사용하여 로컬에서 동작되도록 설계되었습니다. API 주소 변경이 필요한 경우 아래 규칙에 맞춰 `.env` 파일을 생성하세요.

### 개발 환경 (`.env.development.local`)
개발 환경에서는 Vite의 **Proxy(`vite.config.js`)** 기능을 통해 백엔드로 요청을 우회하여 CORS 이슈를 방지합니다.
```env
# Proxy를 통해 타겟이 될 백엔드 서버 주소
VITE_DEV_API_URL=http://localhost:8080
```

### 운영 환경 (`.env.production.local`)
운영 배포 시 브라우저가 직접 백엔드 API로 요청을 보냅니다.
```env
# 운영 백엔드 API 서버의 Base URL 주소 (필수)
VITE_API_URL=https://api.example.com
```

---

## 🔍 핵심 아키텍처 흐름

### 1. 인증(Token) 처리 흐름
- 로그인 시 서버로부터 응답받은 Access Token과 Refresh Token을 브라우저의 `localStorage`에 저장합니다.
- 이후 발생되는 모든 API 요청의 헤더에 `Authorization: Bearer <accessToken>`을 자동으로 포함합니다.
- API 통신 중 HTTP **401 Unauthorized** 예외 발생 시, `axios` 인터셉터가 토큰 만료를 감지하고 `/api/user/refresh`를 호출하여 **Refresh Token**으로 토큰을 재발급받은 후 본래의 요청을 자동 재시도합니다. (해당 파일: `src/api/axios.js`)

### 2. 컴포넌트 보호 (ProtectedRoute)
회원만 접근해야 하는 페이지(예: `/posts/write`, `/profile` 등)는 `ProtectedRoute` 컴포넌트로 감싸주어 토큰이 없는 사용자의 접근을 차단하고 강제로 `/login` 페이지로 라우팅시켜 보호합니다.

---

## 🚨 트러블슈팅 (Troubleshooting)

| 현상 / 에러 메시지 | 예상 원인 | 해결 방안 |
|--------------------|----------|----------|
| **CORS 에러 발생** | 개발 환경의 프록시 설정 부재 또는 운영 서버 백엔드 CORS 미설정 | `vite.config.js` 프록시 경로 점검, 백엔드 Spring WebMvcConfigurer CORS 허용 여부(Origin) 확인 |
| **"Provisional headers are shown"** 혹은 **Network Error (ECONNREFUSED)** | 백엔드 서버가 내려가 있거나 Vite Proxy 타겟 설정 오류 | 백엔드(포트 8080 등)가 정상 구동 중인지 확인 후 `VITE_DEV_API_URL` 값 수정 |
| **401 Unauthorized** (무한 새로고침 현상) | Access Token 검증 실패 또는 Refresh Token 만료 | 브라우저 `localStorage` 정리 및 재로그인 수행 |
| **403 Forbidden** | 관리자 권한 없는 사용자가 관리자 전용 API 호출 | 계정에 ADMIN 권한이 부여되었는지 DB 데이터 점검 |
