import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv의 prefix를 ""로 두면 예상치 못한 환경변수까지 섞여 들어올 수 있어
  // 개발 환경에서 프록시 타겟이 엉뚱한 곳(원격 IP 등)으로 잡히는 문제가 생길 수 있습니다.
  // VITE_ prefix만 로드하도록 제한합니다.
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // IMPORTANT:
  // - dev에서는 VITE_API_URL(운영용)을 무시하고, 로컬 백엔드로 고정합니다.
  //   (전역 환경변수에 VITE_API_URL이 잡혀 있으면 엉뚱한 서버로 프록시되어 장애가 납니다)
  // - dev에서 다른 서버로 붙고 싶으면 VITE_DEV_API_URL을 사용하세요.
  const defaultDevTarget = "http://localhost:8080";
  const target =
    mode === "development"
      ? (env.VITE_DEV_API_URL || defaultDevTarget).trim()
      : (env.VITE_API_URL || defaultDevTarget).trim();

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
