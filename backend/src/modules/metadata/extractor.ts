import axios from "axios";
import * as cheerio from "cheerio";
import type { ExtractedMetadata } from "./types.ts";

const TIMEOUT_MS = 5000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ResourceOrganizer/1.0; +https://resource-organizer.app)";

function getMetaContent($: cheerio.CheerioAPI, name: string): string | undefined {
  return $(`meta[name="${name}"], meta[property="${name}"]`).attr("content");
}

function getFavicon($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
  const iconLink =
    $('link[rel="icon"]').attr("href") ??
    $('link[rel="shortcut icon"]').attr("href") ??
    $('link[rel="apple-touch-icon"]').attr("href");
  if (!iconLink) {
    return undefined;
  }
  try {
    return new URL(iconLink, baseUrl).href;
  } catch {
    return iconLink;
  }
}

function getCanonical($: cheerio.CheerioAPI, originalUrl: string): string {
  const href = $('link[rel="canonical"]').attr("href");
  if (!href) {
    return originalUrl;
  }
  try {
    return new URL(href, originalUrl).href;
  } catch {
    return originalUrl;
  }
}

function getLanguage($: cheerio.CheerioAPI): string | undefined {
  return $("html").attr("lang") ?? undefined;
}

function getAuthor($: cheerio.CheerioAPI): string | undefined {
  return getMetaContent($, "author");
}

export async function extractMetadata(url: string): Promise<ExtractedMetadata> {
  const response = await axios.get(url, {
    timeout: TIMEOUT_MS,
    headers: { "User-Agent": USER_AGENT },
    responseType: "text",
    maxRedirects: 5,
  });

  const html = response.data;
  const $ = cheerio.load(html);

  const ogTitle = getMetaContent($, "og:title");
  const htmlTitle = $("title").text().trim() || undefined;

  const ogDescription = getMetaContent($, "og:description");
  const metaDescription = getMetaContent($, "description");

  const ogSiteName = getMetaContent($, "og:site_name");
  const hostname = new URL(url).hostname;

  const ogImage = getMetaContent($, "og:image");

  return {
    title: ogTitle || htmlTitle,
    description: ogDescription || metaDescription,
    siteName: ogSiteName || hostname,
    image: ogImage,
    favicon: getFavicon($, url),
    canonical: getCanonical($, url),
    language: getLanguage($),
    author: getAuthor($),
  };
}
