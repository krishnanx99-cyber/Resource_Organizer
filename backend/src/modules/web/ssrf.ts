import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Minimal SSRF guard for public page ingestion.
 *
 * Only HTTP/HTTPS, no URL credentials, no non-standard ports, and the
 * resolved hostname must never map to a private/loopback/link-local/reserved
 * address (blocks localhost, LAN hosts, and cloud metadata endpoints such as
 * 169.254.169.254). Each redirect hop is validated the same way.
 */

export function ipAddressBlocked(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [o1 = 0, o2 = 0, o3 = 0, o4 = 0] = address.split(".").map(Number);
    const int = ((o1 << 24) | (o2 << 16) | (o3 << 8) | o4) >>> 0;
    const ranges: Array<[number, number]> = [
      [0, 0x00ffffff], // 0.0.0.0/8
      [0x0a000000, 0x0affffff], // 10.0.0.0/8
      [0x7f000000, 0x7fffffff], // 127.0.0.0/8 loopback
      [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 link-local
      [0xac100000, 0xac1fffff], // 172.16.0.0/12
      [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
      [0xe0000000, 0xffffffff], // multicast + reserved
    ];
    return ranges.some(([lo, hi]) => int >= lo && int <= hi);
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // fe80::/10
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
    if (lower.startsWith("::ffff:")) {
      const mapped = lower.slice(7);
      return ipAddressBlocked(mapped);
    }
    if (lower.startsWith("2001:db8")) return true; // documentation range
  }
  return false;
}

/** Returns the first blocked resolved address, or null when every resolved address is safe. */
export async function resolveBlockedAddress(host: string): Promise<string | null> {
  let addresses;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new Error(`Unable to resolve host: ${host}`);
  }
  for (const address of addresses) {
    if (ipAddressBlocked(address.address)) {
      return address.address;
    }
  }
  return null;
}

/**
 * Validates URL syntax only (protocol, credentials, port). Returns the reason
 * string when the URL must be refused, or null when it is syntactically fine.
 */
export function unsafeUrlReason(urlString: string): string | null {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return "malformed URL";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return `unsupported protocol ${url.protocol}`;
  }
  if (url.username || url.password) {
    return "URL must not contain credentials";
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    return `port ${url.port} is not allowed`;
  }
  return null;
}

export async function assertRequestUrlSafe(urlString: string): Promise<void> {
  const reason = unsafeUrlReason(urlString);
  if (reason) {
    throw new Error(reason);
  }
  const host = new URL(urlString).hostname;
  const blocked = await resolveBlockedAddress(host);
  if (blocked) {
    throw new Error(`refusing request to private/reserved address ${blocked}`);
  }
}

export function isBlockedAddress(address: string): boolean {
  return ipAddressBlocked(address);
}