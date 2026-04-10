import { SESSION_STORAGE_VERSION } from "@/shared/config/security";
import type { Role } from "@/shared/types/auth";

const SESSION_KEY = "docly:session";

export interface StoredSession {
  version: number;
  sessionId: string;
  userId: string;
  role: Role;
  createdAt: number;
  lastActivityAt: number;
}

function safeRead() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function safeWrite(value: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, value);
  } catch {
    return;
  }
}

function safeRemove() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<StoredSession>;

  return (
    candidate.version === SESSION_STORAGE_VERSION &&
    typeof candidate.sessionId === "string" &&
    typeof candidate.userId === "string" &&
    (candidate.role === "patient" || candidate.role === "professional") &&
    typeof candidate.createdAt === "number" &&
    typeof candidate.lastActivityAt === "number"
  );
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const sessionManager = {
  persist(session: {
    userId: string;
    role: Role;
  }) {
    const now = Date.now();
    const stored: StoredSession = {
      version: SESSION_STORAGE_VERSION,
      sessionId: createSessionId(),
      userId: session.userId,
      role: session.role,
      createdAt: now,
      lastActivityAt: now,
    };

    safeWrite(JSON.stringify(stored));

    return stored;
  },
  restore() {
    const raw = safeRead();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isStoredSession(parsed)) {
        safeRemove();
        return null;
      }

      return parsed;
    } catch {
      safeRemove();
      return null;
    }
  },
  touch(expectedSessionId?: string) {
    const current = this.restore();
    if (!current) return null;
    if (expectedSessionId && current.sessionId !== expectedSessionId) return null;

    const updated: StoredSession = {
      ...current,
      lastActivityAt: Date.now(),
    };

    safeWrite(JSON.stringify(updated));
    return updated;
  },
  clear() {
    safeRemove();
  },
};
