import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CATEGORY_URL = "https://github.com/orgs/nl-design-system/discussions/categories/mijn-omgevingen";
const OUTPUT_DIR = new URL("./discussions/", import.meta.url);

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)))
    .replace(/&([a-z]+);/gi, (_, name) => named[name] ?? `&${name};`);
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "vng-api-lab-mijnservices-demo-import/1.0",
      accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractDiscussionIds(categoryHtml) {
  const ids = new Set();
  for (const match of categoryHtml.matchAll(/href="\/orgs\/nl-design-system\/discussions\/([0-9]+)(?:["?#/]|$)/g)) {
    ids.add(match[1]);
  }
  return [...ids].sort((a, b) => Number(a) - Number(b));
}

function extractTitle(html, id) {
  const h1 = html.match(/<span class="js-issue-title markdown-title"[^>]*>([\s\S]*?)<\/span>/);
  const title = h1?.[1] ?? html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? `Discussion ${id}`;
  return decodeHtml(title.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .replace(/\s*·\s*nl-design-system\s*·\s*Discussion\s*#[0-9]+\s*·\s*GitHub$/i, "")
    .trim();
}

function extractAuthorBlocks(html) {
  const authors = [];
  const authorPattern = /<a\b[^>]*class="[^"]*\bauthor\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(authorPattern)) {
    const text = decodeHtml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (text && !authors.includes(text)) authors.push(text);
  }
  return authors;
}

function extractCommentBodies(html) {
  const bodies = [];
  const bodyPattern = /<(div|td)\b(?=[^>]*class="[^"]*\bjs-comment-body\b[^"]*")[^>]*>/g;

  for (const match of html.matchAll(bodyPattern)) {
    const tagName = match[1].toLowerCase();
    const start = match.index + match[0].length;

    if (tagName === "td") {
      const end = html.indexOf("</td>", start);
      if (end !== -1) bodies.push(html.slice(start, end));
      continue;
    }

    let index = start;
    let depth = 1;
    while (index < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", index);
      const nextClose = html.indexOf("</div>", index);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        index = nextOpen + 4;
      } else {
        depth -= 1;
        index = nextClose + 6;
      }
    }

    bodies.push(html.slice(start, index - 6));
  }

  return bodies;
}

function htmlToPlainText(html) {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|table|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
        const cleanText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const cleanHref = href.startsWith("/") ? `https://github.com${href}` : href;
        return `${cleanText} (${cleanHref})`;
      })
      .replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/gi, (_, alt) => (alt ? `[afbeelding: ${alt}]` : "[afbeelding]"))
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const categoryHtml = await fetchText(CATEGORY_URL);
  const ids = extractDiscussionIds(categoryHtml);
  const index = [];

  for (const id of ids) {
    const url = `https://github.com/orgs/nl-design-system/discussions/${id}`;
    const html = await fetchText(url);
    const title = extractTitle(html, id);
    const authors = extractAuthorBlocks(html);
    const bodies = extractCommentBodies(html).map(htmlToPlainText).filter(Boolean);
    const filename = `${id}-${slugify(title) || "discussion"}.txt`;
    const target = new URL(filename, OUTPUT_DIR);
    const sourceBlock = [
      `# ${title}`,
      "",
      `Source: ${url}`,
      `Imported from: ${CATEGORY_URL}`,
      authors.length ? `Detected authors: ${authors.join(", ")}` : null,
      "",
      bodies.map((body, bodyIndex) => `## Bericht ${bodyIndex + 1}\n\n${body}`).join("\n\n---\n\n"),
      "",
    ]
      .filter((line) => line !== null)
      .join("\n");

    await writeFile(target, sourceBlock, "utf8");
    index.push({ id: Number(id), title, url, filename, messageCount: bodies.length });
  }

  await writeFile(new URL("index.json", OUTPUT_DIR), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await writeFile(
    new URL("README.md", OUTPUT_DIR),
    [
      "# Mijn Omgevingen Discussies",
      "",
      `Geimporteerd uit ${CATEGORY_URL}.`,
      "",
      "Deze bestanden zijn plaintext exports van de openbare GitHub Discussions in de categorie `Mijn omgevingen`.",
      "",
      `Aantal discussies: ${index.length}`,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Imported ${index.length} discussions to ${path.relative(process.cwd(), OUTPUT_DIR.pathname)}`);
}

await main();
