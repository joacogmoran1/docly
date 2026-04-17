import { buildApiUrl } from "@/shared/config/api";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

let pendingRequest: Promise<string | null> | null = null;

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";").map((item) => item.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function getCsrfTokenFromCookie() {
  return readCookie(CSRF_COOKIE_NAME);
}

export function getCsrfHeaderName() {
  return CSRF_HEADER_NAME;
}

export async function ensureCsrfCookie() {
  const existingToken = getCsrfTokenFromCookie();
  if (existingToken) {
    return existingToken;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = fetch(buildApiUrl("/auth/csrf-token"), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  })
    .then(() => getCsrfTokenFromCookie())
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}
