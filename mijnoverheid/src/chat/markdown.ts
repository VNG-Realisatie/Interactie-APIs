// Minimale, veilige Markdown → HTML. Bewust klein gehouden (geen dependency):
// dekt wat een chatantwoord normaal gebruikt — koppen, vet/cursief, inline-code,
// codeblokken, lijsten, links en alinea's. Alle invoer wordt eerst ge-escaped,
// daarna passen we een vaste set patronen toe, dus er kan geen rauwe HTML in.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Inline opmaak binnen één regel: code, vet, cursief, links.
function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

export function renderMarkdown(input: string): string {
  const escaped = escapeHtml(input.trim());
  const lines = escaped.split("\n");
  const out: string[] = [];

  let i = 0;
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Codeblok ``` … ```
    if (/^```/.test(line.trim())) {
      closeList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        code.push(lines[i]);
        i++;
      }
      i++; // sluit-fence overslaan
      out.push(`<pre><code>${code.join("\n")}</code></pre>`);
      continue;
    }

    // Koppen (#, ##, ###)
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length + 2; // h3..h5 — passend binnen de bel
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Ongeordende lijst
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      i++;
      continue;
    }

    // Geordende lijst
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      i++;
      continue;
    }

    // Lege regel → witregel tussen blokken
    if (line.trim() === "") {
      closeList();
      i++;
      continue;
    }

    // Verzamel een alinea (opeenvolgende niet-lege, niet-speciale regels)
    closeList();
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^```/.test(lines[i].trim()) &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join("<br/>"))}</p>`);
  }

  closeList();
  return out.join("\n");
}
