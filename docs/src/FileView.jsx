import React, { useState, useEffect } from "react";
import UmlDiagram from "./UmlDiagram";

export default function FileView({ path }) {
  const [content, setContent] = useState("Laden...");
  const [schema, setSchema] = useState(null);

  useEffect(() => {
    setSchema(null);
    setContent("Laden...");

    fetch("/" + path)
      .then((r) => r.text())
      .then((text) => {
        setContent(text);
        if (path.endsWith(".json")) {
          try {
            setSchema(JSON.parse(text));
          } catch (e) {
            console.error("Schema parse error:", e);
          }
        }
      })
      .catch((e) => setContent("Fout bij laden bestand: " + e.message));
  }, [path]);

  const url = window.location.origin + "/" + path;
  const fileName = path.split("/").pop();
  const title = schema?.title || fileName.replace(".json", "");

  const isYaml = path.endsWith(".yaml") || path.endsWith(".yml");
  const respecHtml = isYaml
    ? `/docs/respec/${fileName.replace(/\.ya?ml$/, ".html")}`
    : null;
  const respecPdf = isYaml
    ? `/docs/respec/${fileName.replace(/\.ya?ml$/, ".pdf")}`
    : null;

  return (
    <div className="view-container">
      <h2>{title}</h2>

      {isYaml && (
        <div style={{ marginBottom: "1em" }}>
          <strong>ReSpec: </strong>
          <a href={respecHtml} target="_blank" rel="noopener noreferrer">
            HTML
          </a>
          {" | "}
          <a href={respecPdf} target="_blank" rel="noopener noreferrer">
            PDF
          </a>
        </div>
      )}

      {schema && (
        <>
          <div className="schema-url-box">
            <span>
              Ophalen via URL: <code>{url}</code>
            </span>
            <a
              href={url}
              download={fileName}
              className="version-tag"
              style={{ textDecoration: "none" }}
            >
              Downloaden
            </a>
          </div>

          {/* UML Diagram */}
          <h3>Diagram</h3>
          <div className="diagram-container">
            <UmlDiagram schema={schema} />
          </div>
        </>
      )}

      <h3>Ruwe Inhoud</h3>
      <pre className="raw-content">{content}</pre>
    </div>
  );
}
