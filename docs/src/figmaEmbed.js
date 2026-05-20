const FIGMA_PROTO_RE = /https:\/\/www\.figma\.com\/proto\/[^\s)"']+/;

/** Build a Figma embed iframe URL (required — direct proto URLs block iframe embedding). */
export function toFigmaEmbedSrc(url, { hideUi = true } = {}) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("figma.com")) return url;
    if (hideUi && !parsed.searchParams.has("hide-ui")) {
      parsed.searchParams.set("hide-ui", "1");
    }
    if (!parsed.searchParams.has("bg-color")) {
      parsed.searchParams.set("bg-color", "ffffff");
    }
    const embed = new URL("https://www.figma.com/embed");
    embed.searchParams.set("embed_host", "vng-api-lab");
    embed.searchParams.set("url", parsed.toString());
    return embed.toString();
  } catch {
    return url;
  }
}

/** Parse optional frame size + src from a figma-embed div in markdown. */
export function parseFigmaEmbedAttrs(markdown) {
  const block = markdown.match(/<div[^>]*class="figma-embed"[^>]*>/);
  if (!block) return null;

  const tag = block[0];
  const src = tag.match(/data-figma-src="([^"]+)"/)?.[1];
  if (!src) return null;

  const width = Number(tag.match(/data-figma-width="(\d+)"/)?.[1]);
  const height = Number(tag.match(/data-figma-height="(\d+)"/)?.[1]);

  return {
    src,
    title: tag.match(/data-figma-title="([^"]+)"/)?.[1],
    frameWidth: Number.isFinite(width) ? width : undefined,
    frameHeight: Number.isFinite(height) ? height : undefined,
  };
}

/**
 * Resolve the Figma proto URL for a service document.
 * Priority: explicit figma-embed div → ## Prototype section → ## Links section.
 */
export function extractFigmaFromService(markdown) {
  const embed = parseFigmaEmbedAttrs(markdown);
  if (embed?.src) return embed.src;

  const prototypeSection = markdown.match(/^## Prototype\s*\n([\s\S]*?)(?=\n## |\s*$)/m);
  if (prototypeSection) {
    const match = prototypeSection[1].match(FIGMA_PROTO_RE);
    if (match) return match[0];
  }

  const linksSection = markdown.match(/^## Links\s*\n([\s\S]*?)(?=\n## |\s*$)/m);
  if (linksSection) {
    const match = linksSection[1].match(FIGMA_PROTO_RE);
    if (match) return match[0];
  }

  return null;
}

/** @deprecated use extractFigmaFromService */
export function extractFigmaProtoUrl(markdown) {
  return extractFigmaFromService(markdown);
}

export function figmaEmbedMarkup(figmaUrl, title, { width = 1280, height = 2600 } = {}) {
  return [
    `<div class="figma-embed"`,
    `  data-figma-title="Interactief prototype — ${title}"`,
    `  data-figma-src="${figmaUrl}"`,
    `  data-figma-width="${width}"`,
    `  data-figma-height="${height}"></div>`,
  ].join("\n");
}

/** Fallback: inject prototype block when markdown has a Figma URL but no embed yet. */
export function injectPrototypeAtStart(markdown, figmaUrl, title) {
  if (!figmaUrl || markdown.includes("data-figma-src") || /^## Prototype\s*$/m.test(markdown)) {
    return markdown;
  }

  const embed = [
    "",
    "## Prototype",
    "",
    `Startpunt in [Figma](${figmaUrl}).`,
    "",
    figmaEmbedMarkup(figmaUrl, title),
    "",
  ].join("\n");

  const titleBlock = markdown.match(/^#\s+.+\n+/m);
  if (titleBlock) {
    const insertPos = titleBlock.index + titleBlock[0].length;
    return markdown.slice(0, insertPos) + embed + markdown.slice(insertPos);
  }

  return embed + markdown;
}
