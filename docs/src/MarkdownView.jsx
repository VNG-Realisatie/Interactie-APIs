import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { marked } from "marked";
import BpmnViewer from "bpmn-js/lib/Viewer";
import FigmaEmbedPreview from "./FigmaEmbedPreview";
import {
  injectPrototypeAtStart,
  extractFigmaFromService,
  parseFigmaEmbedAttrs,
} from "./figmaEmbed";

export default function MarkdownView({ path, portalData }) {
  const [html, setHtml] = useState("Laden...");

  const serviceMeta = portalData?.services?.find((s) => s.doc === path);

  useEffect(() => {
    fetch("/" + path)
      .then((r) => r.text())
      .then((text) => {
        let md = text;
        if (path.startsWith("services/")) {
          const embedAttrs = parseFigmaEmbedAttrs(text);
          const figmaUrl = embedAttrs?.src || serviceMeta?.figmaUrl || extractFigmaFromService(text);
          const title =
            serviceMeta?.title ||
            text
              .match(/^#\s+(.+)$/m)?.[1]
              ?.replace(/^Service\s?beschrijving\s*[—–-]\s*/i, "")
              .trim() ||
            path.replace(/^services\//, "").replace(/\.md$/, "");
          if (figmaUrl && !embedAttrs?.src) {
            md = injectPrototypeAtStart(text, figmaUrl, title);
          }
        }
        setHtml(marked.parse(md));
      })
      .catch((e) => setHtml("Fout bij laden document: " + e.message));
  }, [path, serviceMeta?.figmaUrl, serviceMeta?.title]);

  useEffect(() => {
    const roots = Array.from(document.querySelectorAll("[data-bpmn-src]"));
    if (roots.length === 0) return undefined;

    // Size the canvas to the diagram's own aspect ratio, then fit.
    const sizeAndFit = (viewer, canvas) => {
      try {
        const bpmnCanvas = viewer.get("canvas");
        const inner = bpmnCanvas.viewbox().inner;
        if (inner && inner.width > 0 && inner.height > 0) {
          const width = canvas.clientWidth || 800;
          const height = width * (inner.height / inner.width);
          canvas.style.height = `${Math.max(160, Math.min(760, Math.round(height)))}px`;
        }
        // Tell bpmn-js the container changed size before fitting.
        bpmnCanvas.resized();
        bpmnCanvas.zoom("fit-viewport");
      } catch (_) {}
    };

    const instances = roots.map((root) => {
      const src = root.getAttribute("data-bpmn-src");
      const title = root.getAttribute("data-bpmn-title");

      // ensure deterministic mount point
      root.innerHTML = "";
      const canvas = document.createElement("div");
      canvas.className = "bpmn-canvas";
      root.appendChild(canvas);

      if (title) {
        const header = document.createElement("div");
        header.className = "bpmn-header";
        header.textContent = title;
        root.insertBefore(header, canvas);
      }

      const viewer = new BpmnViewer({
        container: canvas,
        keyboard: { bindTo: document },
      });

      // load and render
      if (src) {
        fetch(src)
          .then((r) => r.text())
          .then((xml) => viewer.importXML(xml))
          .then(() => {
            const elementRegistry = viewer.get("elementRegistry");
            const elements = elementRegistry.getAll();
            const hasRenderable = elements.some((el) => el && el.type && el.type !== "bpmn:Definitions");
            if (!hasRenderable) {
              canvas.innerHTML =
                "BPMN geladen, maar geen diagram-layout (BPMN DI) gevonden. Voeg BPMN DI (shapes/edges) toe aan het .bpmn bestand.";
              return;
            }
            sizeAndFit(viewer, canvas);

            const getDocUrl = (element) => {
              const text = element?.businessObject?.documentation?.[0]?.text?.trim();
              return text && /^https?:\/\//i.test(text) ? text : null;
            };
            elementRegistry.forEach((element) => {
              if (!getDocUrl(element)) return;
              const gfx = elementRegistry.getGraphics(element);
              if (gfx) gfx.classList.add("bpmn-clickable");
            });
            viewer.get("eventBus").on("element.click", (event) => {
              const url = getDocUrl(event.element);
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            });
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error("BPMN render error:", err);
            canvas.innerHTML = "Kon BPMN niet laden/renderen.";
          });
      } else {
        canvas.innerHTML = "Geen BPMN bron opgegeven.";
      }

      return { viewer, canvas };
    });

    const refit = () => {
      instances.forEach(({ viewer, canvas }) => sizeAndFit(viewer, canvas));
    };
    window.addEventListener("resize", refit);

    return () => {
      window.removeEventListener("resize", refit);
      instances.forEach(({ viewer }) => {
        try {
          viewer.destroy();
        } catch (_) {}
      });
    };
  }, [html]);

  useEffect(() => {
    const hosts = Array.from(document.querySelectorAll("[data-figma-src]"));
    if (hosts.length === 0) return undefined;

    const instances = hosts.map((host) => {
      const src = host.getAttribute("data-figma-src");
      const title = host.getAttribute("data-figma-title") || "Interactief prototype (Figma)";
      const frameWidth = Number(host.getAttribute("data-figma-width"));
      const frameHeight = Number(host.getAttribute("data-figma-height"));
      host.classList.add("figma-embed-host");
      const root = createRoot(host);
      root.render(
        <FigmaEmbedPreview
          src={src}
          title={title}
          frameWidth={Number.isFinite(frameWidth) ? frameWidth : undefined}
          frameHeight={Number.isFinite(frameHeight) ? frameHeight : undefined}
        />,
      );
      return { host, root };
    });

    return () => {
      instances.forEach(({ root }) => {
        root.unmount();
      });
    };
  }, [html]);

  const renderDataList = () => {
    if (!portalData) return null;

    let items = [];
    let title = "";
    let linkPrefix = "";

    if (path === "docs/apis.md" && portalData.apis) {
      items = portalData.apis;
      title = "Beschikbare APIs";
      linkPrefix = "/?url=";
    } else if (path === "docs/schemas.md" && portalData.schemas) {
      items = portalData.schemas;
      title = "Beschikbare Schemas";
      linkPrefix = "/?file=";
    } else if (path === "docs/patterns.md" && portalData.patterns) {
      items = portalData.patterns;
      title = "Beschikbare Patronen";
      linkPrefix = "/?file=";
    } else if (path === "docs/services.md" && portalData.services) {
      items = portalData.services;
      title = "Beschikbare Services";
      linkPrefix = "/?doc=";
    } else {
      return null;
    }

    if (items.length === 0) return null;

    if (path === "docs/services.md") {
      return (
        <section className="service-overview" aria-labelledby="services-heading">
          <h2 id="services-heading">{title}</h2>
          <div className="service-card-grid">
            {items.map((item, i) => (
              <a key={i} className="service-card" href={"/?doc=" + item.doc}>
                <span className="service-card-kicker">MijnService</span>
                <h3>{item.title}</h3>
                {item.description && <p>{item.description}</p>}
                <span className="service-card-link">
                  Bekijk servicebeschrijving
                  {item.figmaUrl ? " en prototype" : ""}
                </span>
              </a>
            ))}
          </div>
        </section>
      );
    }

    return (
      <div className="card" style={{ marginTop: "2em", padding: "24px" }}>
        <h2>{title}</h2>
        <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
          {items.map((item, i) => {
            const linkUrl = item.versions[0].url || item.versions[0].path;
            const displayName = item.title || item.name;
            const fileName = item.versions[0].sourceUrl
              ? item.versions[0].sourceUrl
                  .replace(/^\/apis\//, "")
                  .replace(/\//g, "_")
                  .replace(/\.(json|yaml|yml)$/, "")
              : null;
            const isApi = path === "docs/apis.md";
            const respecHtml = isApi && fileName ? `/docs/respec/${fileName}.html` : null;
            const respecPdf = isApi && fileName ? `/docs/respec/${fileName}.pdf` : null;

            return (
              <li key={i} style={{ marginBottom: "16px" }}>
                <div
                  style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}
                >
                  <a
                    href={linkPrefix + linkUrl}
                    style={{ textDecoration: "none", fontWeight: "600", fontSize: "1.1em" }}
                  >
                    {displayName}
                  </a>
                  {respecHtml && (
                    <span style={{ fontSize: "0.85em", color: "#666" }}>
                      (
                      <a href={respecHtml} target="_blank" rel="noopener noreferrer">
                        HTML
                      </a>
                      {" | "}
                      <a href={respecPdf} target="_blank" rel="noopener noreferrer">
                        PDF
                      </a>
                      )
                    </span>
                  )}
                </div>
                {item.description && (
                  <div
                    style={{
                      marginTop: "4px",
                      color: "#555",
                      fontSize: "0.95em",
                      lineHeight: "1.5",
                    }}
                    dangerouslySetInnerHTML={{ __html: marked.parseInline(item.description) }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="view-container">
      <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />
      {renderDataList()}
    </div>
  );
}
