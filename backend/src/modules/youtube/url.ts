const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

const WATCH_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function isWatchHost(hostname: string): boolean {
  return WATCH_HOSTS.has(hostname.replace(/^www\./, ""));
}

function validId(videoId: string | null | undefined): string | null {
  return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

export function extractVideoId(url: string): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    return validId(parsed.pathname.split("/")[1]);
  }

  if (isWatchHost(host)) {
    if (parsed.pathname === "/watch") {
      return validId(parsed.searchParams.get("v"));
    }
    for (const prefix of ["/embed/", "/shorts/", "/live/"]) {
      if (parsed.pathname.startsWith(prefix)) {
        return validId(parsed.pathname.slice(prefix.length).split("/")[0]);
      }
    }
  }

  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return extractVideoId(url) != null;
}

export function buildYouTubeDeepLink(videoId: string, seconds: number | null): string {
  if (!validId(videoId)) return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return `https://youtu.be/${videoId}`;
  }
  const t = Math.max(0, Math.floor(seconds));
  return `https://youtu.be/${videoId}?t=${t}`;
}

export function deepLinkFromResourceUrl(url: string | null, seconds: number | null): string | null {
  if (!url) return null;
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  return buildYouTubeDeepLink(videoId, seconds);
}