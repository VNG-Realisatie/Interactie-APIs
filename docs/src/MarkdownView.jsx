import React, { useState, useEffect } from "react";
import { marked } from "marked";

export default function MarkdownView({ path, portalData }) {
  const [html, setHtml] = useState("Laden...");

  useEffect(() => {
    fetch("/" + path)
      .then((r) => r.text())
      .then((text) => setHtml(marked.parse(text)))
      .catch((e) => setHtml("Fout bij laden document: " + e.message));
  }, [path]);

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
    } else {
      return null;
    }

    if (items.length === 0) return null;

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
