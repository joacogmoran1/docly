import tls from "node:tls";
import { setTimeout as delay } from "node:timers/promises";
import { getAppOrigin, getGmailInboxConfig } from "./env";

interface WaitForResetUrlOptions {
  recipient: string;
  requestedAfter: Date;
  timeoutMs?: number;
}

class ImapConnection {
  private socket: tls.TLSSocket | null = null;
  private buffer = "";
  private commandId = 0;

  constructor(
    private readonly config: {
      host: string;
      port: number;
      user: string;
      password: string;
    },
  ) {}

  async connect() {
    this.socket = tls.connect({
      host: this.config.host,
      port: this.config.port,
      servername: this.config.host,
    });
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
    });

    await this.waitFor((buffer) => /^\* OK/m.test(buffer));
    await this.command(`LOGIN ${quoteImapString(this.config.user)} ${quoteImapString(this.config.password)}`);
    await this.command('SELECT "INBOX"');
  }

  async searchResetMessages(recipient: string, requestedAfter: Date) {
    const since = formatImapDate(requestedAfter);
    const response = await this.command(
      `UID SEARCH SINCE ${quoteImapString(since)} TO ${quoteImapString(recipient)}`,
    );
    const match = /\* SEARCH\s+([0-9\s]*)/i.exec(response);
    return (match?.[1] ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter(Number.isFinite);
  }

  async fetchMessage(uid: number) {
    return this.command(`UID FETCH ${uid} (BODY.PEEK[])`, 20_000);
  }

  async logout() {
    try {
      await this.command("LOGOUT", 5_000);
    } catch {
      // The socket may already be closed after LOGOUT; nothing useful to report.
    } finally {
      this.socket?.destroy();
      this.socket = null;
    }
  }

  private async command(command: string, timeoutMs = 15_000) {
    if (!this.socket) {
      throw new Error("Gmail IMAP connection is not open.");
    }

    const tag = `A${String(++this.commandId).padStart(4, "0")}`;
    this.buffer = "";
    this.socket.write(`${tag} ${command}\r\n`);

    const response = await this.waitFor(
      (buffer) => new RegExp(`^${tag} (OK|NO|BAD)`, "m").test(buffer),
      timeoutMs,
    );
    const statusMatch = new RegExp(`^${tag} (OK|NO|BAD)`, "m").exec(response);
    if (statusMatch?.[1] !== "OK") {
      throw new Error(`Gmail IMAP command failed: ${redactSensitiveCommand(command)}`);
    }

    return response;
  }

  private waitFor(predicate: (buffer: string) => boolean, timeoutMs = 15_000) {
    return new Promise<string>((resolve, reject) => {
      const startedAt = Date.now();
      const interval = setInterval(() => {
        if (predicate(this.buffer)) {
          clearInterval(interval);
          resolve(this.buffer);
          return;
        }

        if (Date.now() - startedAt > timeoutMs) {
          clearInterval(interval);
          reject(new Error("Timed out waiting for Gmail IMAP response."));
        }
      }, 50);
    });
  }
}

export async function waitForLatestResetPasswordUrl({
  recipient,
  requestedAfter,
  timeoutMs = 90_000,
}: WaitForResetUrlOptions) {
  const config = getGmailInboxConfig();
  const connection = new ImapConnection(config);
  const deadline = Date.now() + timeoutMs;

  await connection.connect();
  try {
    while (Date.now() < deadline) {
      const uids = await connection.searchResetMessages(recipient, requestedAfter);
      for (const uid of uids.slice(-10).reverse()) {
        const rawMessage = await connection.fetchMessage(uid);
        const resetUrl = extractResetPasswordUrl(rawMessage, requestedAfter);
        if (resetUrl) {
          return resetUrl;
        }
      }

      await delay(5_000);
    }
  } finally {
    await connection.logout();
  }

  throw new Error(`No reset password email arrived in Gmail for ${recipient}.`);
}

function extractResetPasswordUrl(rawMessage: string, requestedAfter: Date) {
  if (!rawMessage.includes("/auth/reset-password")) {
    return null;
  }

  const sentAt = getMessageDate(rawMessage);
  if (sentAt && sentAt.getTime() + 30_000 < requestedAfter.getTime()) {
    return null;
  }

  const normalized = decodeHtmlEntities(removeQuotedPrintableSoftBreaks(rawMessage));
  const appOrigin = escapeRegExp(getAppOrigin());
  const urlMatch = new RegExp(
    `${appOrigin}/auth/reset-password\\?token=[^\\s"'<>]+`,
  ).exec(normalized);

  return urlMatch?.[0] ?? null;
}

function getMessageDate(rawMessage: string) {
  const match = /^Date:\s*(.+)$/im.exec(rawMessage);
  if (!match) {
    return null;
  }

  const date = new Date(match[1]);
  return Number.isNaN(date.getTime()) ? null : date;
}

function removeQuotedPrintableSoftBreaks(value: string) {
  return value.replace(/=\r?\n/g, "");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function formatImapDate(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getUTCDate()}-${months[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

function quoteImapString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function redactSensitiveCommand(command: string) {
  return command.startsWith("LOGIN ") ? "LOGIN <redacted>" : command;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
