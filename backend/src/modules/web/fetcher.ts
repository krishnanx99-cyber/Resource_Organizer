import axios from "axios";
import { assertRequestUrlSafe, unsafeUrlReason, isBlockedAddress } from "./ssrf.ts";

const TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ResourceOrganizer/1.0; +https://resource-organizer.app)";

export type FetchPageOutcome =
  | { kind: "ok"; html: string; finalUrl: string }
  | { kind: "unsupported"; reason: string }
  | { kind: "error"; message: string };

function isLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  );
}

/** Synchronous per-hop check (DNS resolution happens after the request). */
function unsafeRedirectHopReason(href: string): string | null {
  const reason = unsafeUrlReason(href);
  if (reason) return reason;
  const host = new URL(href).hostname;
  if (isLocalHostname(host)) return `redirect to local hostname ${host}`;
  if (isBlockedAddress(host)) return `redirect to private/reserved address ${host}`;
  return null;
}

export async function fetchWebPage(urlString: string): Promise<FetchPageOutcome> {
  try {
    await assertRequestUrlSafe(urlString);
  } catch (err) {
    return {
      kind: "unsupported",
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    const response = await axios.get(urlString, {
      timeout: TIMEOUT_MS,
      maxRedirects: 5,
      maxContentLength: MAX_RESPONSE_BYTES,
      maxBodyLength: MAX_RESPONSE_BYTES,
      responseType: "text",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
      },
      beforeRedirect: (options: { href?: string | URL }) => {
        const href = options.href ? String(options.href) : undefined;
        if (href) {
          const blocked = unsafeRedirectHopReason(href);
          if (blocked) {
            throw new Error(blocked);
          }
        }
      },
      validateStatus: (status) => status >= 200 && status < 300,
      transitional: { clarifyTimeoutError: true },
    });

    const finalUrl =
      (response.request as { res?: { responseUrl?: string } } | undefined)?.res?.responseUrl ??
      urlString;

    // Re-verify the final destination hostname against its DNS records before
    // we persist a single byte. A redirect can rebind a friendly hostname to a
    // private address; refuse the page in that case.
    try {
      await assertRequestUrlSafe(finalUrl);
    } catch (err) {
      return {
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }

    const html = typeof response.data === "string" ? response.data : "";
    const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      return { kind: "unsupported", reason: `non-HTML content type: ${contentType}` };
    }

    if (!html || html.trim().length === 0) {
      return { kind: "unsupported", reason: "empty response body" };
    }

    return { kind: "ok", html, finalUrl };
  } catch (err) {
    const error = err as { response?: { status?: number }; message?: string };
    const status = error.response?.status;
    if (status !== undefined && [401, 403, 404, 410, 451].includes(status)) {
      return { kind: "unsupported", reason: `HTTP ${status}` };
    }
    if (status !== undefined && status >= 500) {
      return { kind: "error", message: `HTTP ${status}` };
    }
    if (status !== undefined) {
      return { kind: "error", message: `unexpected HTTP ${status}` };
    }
    return { kind: "error", message: error.message ?? String(err) };
  }
}