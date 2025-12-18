// 사용자에게 보여줄 에러 메시지 통일
// - axios 에러 응답 구조/문자열 응답/일반 Error 모두 대응

export function getUserErrorMessage(error, fallback = "요청 처리 중 오류가 발생했습니다.") {
  // axios response 기반
  const status = error?.response?.status;
  const data = error?.response?.data;

  // 백엔드가 { message } 형태로 주는 경우
  if (data && typeof data === "object" && typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  // 백엔드가 text/plain 문자열로 주는 경우
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  // 상태코드 기반 기본 메시지
  if (status === 400) return "요청 값이 올바르지 않습니다.";
  if (status === 401) return "로그인이 필요합니다.";
  if (status === 403) return "권한이 없습니다.";
  if (status === 404) return "요청한 정보를 찾을 수 없습니다.";
  if (status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

  // 네트워크/프록시/CORS 등 응답이 없는 경우
  if (!error?.response && typeof error?.message === "string" && error.message.trim()) {
    return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
  }

  // 마지막 fallback
  return fallback;
}


