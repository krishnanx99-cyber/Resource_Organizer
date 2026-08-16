import {
  extractVideoId,
  isYouTubeUrl,
  buildYouTubeDeepLink,
  deepLinkFromResourceUrl,
} from "./src/modules/youtube/url.ts";

function eq(a: unknown, b: unknown, label: string) {
  const pass = a === b;
  console.log(`${pass ? "PASS" : "FAIL"} ${label}${pass ? "" : ` — expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`}`);
  if (!pass) throw new Error(label);
}

function ok(cond: unknown, label: string, detail?: string) {
  const pass = Boolean(cond);
  console.log(`${pass ? "PASS" : "FAIL"} ${label}${pass ? "" : ` — ${detail ?? ""}`}`);
  if (!pass) throw new Error(label);
}

const ID = "dQw4w9WgXcQ";

let failed = 0;
try {
  eq(extractVideoId(`https://www.youtube.com/watch?v=${ID}`), ID, "watch url");
  eq(extractVideoId(`https://youtu.be/${ID}`), ID, "youtu.be short url");
  eq(extractVideoId(`https://youtu.be/${ID}?t=42`), ID, "youtu.be with t param");
  eq(extractVideoId(`https://m.youtube.com/watch?v=${ID}&t=5`), ID, "mobile watch url");
  eq(extractVideoId(`https://www.youtube.com/embed/${ID}`), ID, "embed url");
  eq(extractVideoId(`https://www.youtube.com/shorts/${ID}`), ID, "shorts url");
  eq(extractVideoId(`https://www.youtube.com/live/${ID}`), ID, "live url");
eq(extractVideoId(`https://www.youtube.com/watch?v=${ID}&list=PL123`), ID, "watch url with list");
eq(extractVideoId(`youtube.com/watch?v=${ID}`), null, "scheme-less url is not recognized (URL parser needs scheme)");

  eq(extractVideoId(`https://www.youtube.com/watch?v=abc`), null, "invalid id returned as null");
  eq(extractVideoId(`https://www.youtube.com/watch?v=`), null, "missing v param");
  eq(extractVideoId(`https://example.com/watch?v=${ID}`), null, "non-youtube host");
  eq(extractVideoId(`https://www.youtube.com/feed`), null, "non-video path");
  eq(extractVideoId("not a url"), null, "malformed url");
  eq(extractVideoId(""), null, "empty url");

  ok(isYouTubeUrl(`https://youtu.be/${ID}`), "isYouTubeUrl true for youtu.be");
  ok(!isYouTubeUrl("https://example.com"), "isYouTubeUrl false for example.com");

  eq(buildYouTubeDeepLink(ID, 63.7), `https://youtu.be/${ID}?t=63`, "deep link floors seconds");
  {
    // Req: link must carry SECONDS-resolution t (≈1122), never raw ms (1121679).
    const link = buildYouTubeDeepLink("0g1FCZ9rk6A", 1121.679);
    const t = Number(link.split("?t=")[1] ?? 0);
    ok(Number.isInteger(t), "deep link t is an integer");
    ok(t >= 1121 && t <= 1122, `deep link t (${t}) is second-resolution (≈1122), not ms (1121679)`);
    ok(!link.includes("1121679"), "deep link does not embed raw ms value");
  }
  eq(buildYouTubeDeepLink(ID, 0), `https://youtu.be/${ID}`, "deep link no ?t for zero");
  eq(buildYouTubeDeepLink(ID, null), `https://youtu.be/${ID}`, "deep link no ?t for null");
  eq(buildYouTubeDeepLink(ID, -5), `https://youtu.be/${ID}`, "deep link clamps negative");

  eq(
    deepLinkFromResourceUrl(`https://www.youtube.com/watch?v=${ID}`, 120),
    `https://youtu.be/${ID}?t=120`,
    "deep link from watch url + seconds",
  );
  eq(deepLinkFromResourceUrl(null, 120), null, "deep link null when no url");
  eq(deepLinkFromResourceUrl("https://example.com", 120), null, "deep link null when not youtube");

  console.log("\nALL YOUTUBE URL TESTS PASSED");
} catch (err) {
  failed = 1;
  console.error("\nYOUTUBE URL TEST FAILED:", err);
}
process.exit(failed);