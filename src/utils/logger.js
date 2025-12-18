// 개발 환경에서만 로그를 출력하는 경량 로거
// - 운영(PROD)에서는 콘솔 노이즈를 최소화합니다.

const isDev = import.meta.env.DEV;

export function logDebug(scope, ...args) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.log(`[${scope}]`, ...args);
}

export function logWarn(scope, ...args) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.warn(`[${scope}]`, ...args);
}

export function logError(scope, error, extra = undefined) {
  if (!isDev) return;
  const payload = {
    message: error?.message,
    name: error?.name,
    status: error?.response?.status,
    url: error?.config?.url,
    method: error?.config?.method,
    data: error?.response?.data,
    extra,
  };
  // eslint-disable-next-line no-console
  console.error(`[${scope}]`, payload);
}


