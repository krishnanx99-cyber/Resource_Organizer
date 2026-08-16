import type { WebBlock, WebChunkDraft } from "./types.ts";

export interface WebChunkerOptions {
  targetChars?: number;
  maxChars?: number;
  minChars?: number;
}

export const DEFAULT_WEB_CHUNKER_OPTIONS: Required<WebChunkerOptions> = {
  targetChars: 1500,
  maxChars: 2200,
  minChars: 150,
};

const SENTENCE_END_CHARS = new Set([".", "!", "?", "…"]);

/**
 * Split an oversized single text blob at the last sentence boundary within
 * `maxChars`, falling back to a word boundary (minimum tail of 100 chars so we
 * never fragment mid-phrase).
 */
function splitBlob(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    let cut = -1;
    for (let i = maxChars - 1; i >= 0; i--) {
      const ch = rest[i]!;
      if (SENTENCE_END_CHARS.has(ch)) {
        const next = rest[i + 1];
        if (next === " " || next === "\n" || next === undefined) {
          cut = i + 1;
          break;
        }
      }
    }
    if (cut < 100) {
      const space = rest.lastIndexOf(" ", maxChars);
      cut = space > 100 ? space : maxChars;
    }
    pieces.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  const tail = rest;
  if (tail) pieces.push(tail);
  return pieces;
}

interface Section {
  heading: string | null;
  blocks: WebBlock[];
}

function collectSections(blocks: WebBlock[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, blocks: [] };
  for (const block of blocks) {
    if (block.type === "heading") {
      if (current.blocks.length > 0) {
        sections.push(current);
      }
      current = { heading: block.text, blocks: [] };
    } else {
      current.blocks.push(block);
    }
  }
  if (current.blocks.length > 0) {
    sections.push(current);
  }
  return sections;
}

/** Group section blocks into target-sized drafts; every draft carries its section heading. */
function splitSection(section: Section, opts: Required<WebChunkerOptions>): WebChunkDraft[] {
  const drafts: WebChunkDraft[] = [];
  let current: string[] = [];
  let currentLen = 0;

  const flush = (): void => {
    if (current.length === 0) return;
    const body = current.join("\n\n");
    drafts.push({
      text: section.heading ? `${section.heading}\n\n${body}` : body,
      heading: section.heading,
    });
    current = [];
    currentLen = 0;
  };

  for (const block of section.blocks) {
    for (const piece of splitBlob(block.text, opts.maxChars)) {
      if (currentLen === 0) {
        current = [piece];
        currentLen = piece.length;
        continue;
      }
      if (currentLen + piece.length + 2 <= opts.maxChars) {
        current.push(piece);
        currentLen += piece.length + 2;
      } else {
        flush();
        current = [piece];
        currentLen = piece.length;
      }
    }
  }
  flush();
  return drafts;
}

function mergeTinyTails(drafts: WebChunkDraft[], minChars: number): WebChunkDraft[] {
  const merged: WebChunkDraft[] = [];
  for (const draft of drafts) {
    const prev = merged[merged.length - 1];
    if (prev && draft.text.length < minChars) {
      prev.text = `${prev.text}\n\n${draft.text}`;
      prev.heading = prev.heading ?? draft.heading;
    } else {
      merged.push(draft);
    }
  }
  return merged;
}

export function chunkWebBlocks(blocks: WebBlock[], options: WebChunkerOptions = {}): WebChunkDraft[] {
  const opts: Required<WebChunkerOptions> = { ...DEFAULT_WEB_CHUNKER_OPTIONS, ...options };
  if (blocks.length === 0) return [];

  const drafts: WebChunkDraft[] = [];
  for (const section of collectSections(blocks)) {
    drafts.push(...splitSection(section, opts));
  }
  return mergeTinyTails(drafts, opts.minChars);
}