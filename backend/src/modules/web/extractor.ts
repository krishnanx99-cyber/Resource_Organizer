import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { ExtractedMetadata } from "../metadata/types.ts";
import type { ExtractedWebPage, WebBlock } from "./types.ts";

const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "form",
  "aside",
  "[aria-hidden='true']",
  "[hidden]",
  "[class*='cookie' i]",
  "[id*='cookie' i]",
  "[class*='consent' i]",
  "[id*='consent' i]",
  "[class*='ad-']",
  "[id*='ad-']",
  "[class*='advert' i]",
  "[id*='advert' i]",
  "[class*='banner' i]",
  "[class*='popup' i]",
  "[class*='modal' i]",
  "[class*='newsletter' i]",
  "[class*='subscribe' i]",
  "[class*='related' i]",
  "[class*='sidebar' i]",
  "[id*='sidebar' i]",
];

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const LEAF_TEXT_TAGS = new Set(["p", "li", "pre", "figcaption"]);
const RECURSE_TAGS = new Set([
  "div",
  "section",
  "article",
  "main",
  "blockquote",
  "ul",
  "ol",
  "figure",
  "table",
  "td",
  "th",
  "li",
  "span",
]);

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function removeNoise($: cheerio.CheerioAPI): void {
  $(NOISE_SELECTORS.join(",")).remove();
  // A <header> that contains navigation is site chrome; keep other headers.
  $("header").each((_, el) => {
    if ($(el).find("nav").length > 0) {
      $(el).remove();
    }
  });
}

function getMetaContent($: cheerio.CheerioAPI, name: string): string | undefined {
  return $(`meta[name="${name}"], meta[property="${name}"]`).attr("content");
}

function resolveUrl(href: string | undefined, base: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, base).href;
  } catch {
    return undefined;
  }
}

/** Open Graph + standard HTML + canonical metadata, mirroring the legacy extractor. */
export function extractPageMetadata(html: string, pageUrl: string): ExtractedMetadata {
  const $ = cheerio.load(html);
  const metadata: ExtractedMetadata = {};

  const ogTitle = getMetaContent($, "og:title");
  const htmlTitle = $("title").text().trim() || undefined;
  metadata.title = ogTitle || htmlTitle;

  const ogDescription = getMetaContent($, "og:description");
  const metaDescription = getMetaContent($, "description");
  metadata.description = ogDescription || metaDescription;

  metadata.siteName = getMetaContent($, "og:site_name") || new URL(pageUrl).hostname;

  const ogImage = getMetaContent($, "og:image");
  metadata.image = ogImage;

  metadata.favicon = resolveUrl(
    $('link[rel="icon"]').attr("href") ??
      $('link[rel="shortcut icon"]').attr("href") ??
      $('link[rel="apple-touch-icon"]').attr("href"),
    pageUrl,
  );

  metadata.canonical = resolveUrl($('link[rel="canonical"]').attr("href"), pageUrl) ?? pageUrl;
  metadata.language = $("html").attr("lang") ?? undefined;
  metadata.author = getMetaContent($, "author");

  return metadata;
}

const MIN_BLOCK_CHARS = 20;

function bestContainer($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  let best: cheerio.Cheerio<AnyNode> = $("body");
  let bestScore = -1;
  const candidates = $("body *").toArray();
  for (const el of candidates) {
    const $el = $(el);
    if ($el.children("p,li,pre,blockquote,h1,h2,h3,h4,h5,h6").length < 2) continue;
    const clone = $el.clone();
    clone.find("script,style,noscript,nav,footer,iframe,aside,header").remove();
    const text = normalizeText(clone.text());
    if (text.length < 200) continue;
    const linkText = normalizeText(clone.find("a").text()).length;
    const score = text.length - linkText * 2;
    if (score > bestScore) {
      bestScore = score;
      best = $el;
    }
  }
  return best;
}

function pickContainer($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  const article = $("article").first();
  if (article.length > 0) return article;
  const main = $("main").first();
  if (main.length > 0) return main;
  return bestContainer($);
}

function walkBlocks($: cheerio.CheerioAPI, element: AnyNode, blocks: WebBlock[]): void {
  const children = $(element).children().toArray();
  for (const child of children) {
    if (child.type !== "tag") continue;
    const $child = $(child);
    const tag = (child.tagName ?? "").toLowerCase();

    if (HEADING_TAGS.has(tag)) {
      const text = normalizeText($child.text());
      if (text) blocks.push({ type: "heading", level: Number(tag[1]), text });
      continue;
    }

    if (tag === "img") {
      const alt = $child.attr("alt");
      if (alt && normalizeText(alt).length >= MIN_BLOCK_CHARS) {
        blocks.push({ type: "paragraph", text: normalizeText(alt) });
      }
      continue;
    }

    if (LEAF_TEXT_TAGS.has(tag)) {
      const text = normalizeText($child.text());
      if (text.length < MIN_BLOCK_CHARS) continue;
      if (tag === "pre") blocks.push({ type: "code", text });
      else if (tag === "li") blocks.push({ type: "list", text });
      else if (tag === "figcaption") blocks.push({ type: "paragraph", text });
      else blocks.push({ type: "paragraph", text });
      continue;
    }

    if (tag === "blockquote") {
      walkBlocks($, child, blocks);
      continue;
    }

    const hasElementChildren = $child.children().length > 0;
    if (!hasElementChildren) {
      const text = normalizeText($child.text());
      if (text.length >= MIN_BLOCK_CHARS) {
        blocks.push({ type: "paragraph", text });
      }
      continue;
    }

    if (RECURSE_TAGS.has(tag)) {
      walkBlocks($, child, blocks);
    }
  }
}

/**
 * Deterministic readable-content extraction:
 * `<article>` -> `<main>` -> highest text-density container.
 * Returns an ordered list of clean text blocks (headings and body kept separate)
 * plus extracted metadata. Raw HTML is never returned.
 */
export function extractWebPage(html: string, pageUrl: string): ExtractedWebPage {
  const $ = cheerio.load(html);
  removeNoise($);
  const container = pickContainer($);
  const blocks: WebBlock[] = [];
  walkBlocks($, container[0]!, blocks);
  const metadata = extractPageMetadata(html, pageUrl);
  return { metadata, blocks };
}