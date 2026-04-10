import type { AuthTokens } from "@/shared/types/auth";

let tokens: AuthTokens | null = null;

function isExpired(expiresAt: string) {
  return Number.isNaN(Date.parse(expiresAt)) || Date.now() >= Date.parse(expiresAt);
}

export const tokenStorage = {
  get() {
    if (tokens?.expiresAt && isExpired(tokens.expiresAt)) {
      tokens = null;
      return null;
    }

    return tokens;
  },
  set(nextTokens: AuthTokens | null) {
    tokens = nextTokens?.expiresAt && !isExpired(nextTokens.expiresAt) ? nextTokens : null;
  },
  clear() {
    tokens = null;
  },
};
