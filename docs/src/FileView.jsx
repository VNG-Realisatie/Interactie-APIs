import React, { useState, useEffect } from "react";
import { marked } from "marked";
import yaml from "js-yaml";
import UmlDiagram from "./UmlDiagram";

function resolveRefLink(currentPath, refPath) {
  if (!refPath) return "#";
  if (refPath.startsWith("#")) return `/?file=${currentPath}`;
  try {
    const url = new URL(refPath, "http://dummy/" + currentPath);
    const resolvedPath = url.pathname.slice(1);
    return `/?file=${resolvedPath}`;
  } catch (e) {
    return "#";
  }
}

export default function FileView({ path, navigate }) {
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
        } else if (path.endsWith(".yaml") || path.endsWith(".yml")) {
          try {
            setSchema(yaml.load(text));
          } catch (e) {
            console.error("YAML parse error:", e);
          }
        }
      })
      .catch((e) => setContent("Fout bij laden bestand: " + e.message));
  }, [path]);

  const url = window.location.origin + "/" + path;
  const fileName = path.split("/").pop();
  const title = schema?.title || fileName.replace(/\.(json|ya?ml)$/, "");

  const isYaml = path.endsWith(".yaml") || path.endsWith(".yml");
  const isSchema = path.startsWith("schemas/");
  const isPattern = path.startsWith("patterns/");

  const showRespec = isYaml && !isPattern;
  const respecHtml = showRespec ? `/docs/respec/${fileName.replace(/\.ya?ml$/, ".html")}` : null;
  const respecPdf = showRespec ? `/docs/respec/${fileName.replace(/\.ya?ml$/, ".pdf")}` : null;

  const breadcrumbText = isSchema ? "Schema's" : isPattern ? "Patronen" : null;
  const breadcrumbDoc = isSchema ? "docs/schemas.md" : isPattern ? "docs/patterns.md" : null;

  return (
    <div className="view-container">
      {breadcrumbText && (
        <div
          className="breadcrumb"
          style={{ marginBottom: "10px", fontSize: "0.95em", color: "#666" }}
        >
          <a
            href={`/?doc=${breadcrumbDoc}`}
            onClick={(e) => {
              e.preventDefault();
              if (navigate) navigate(`doc=${breadcrumbDoc}`);
            }}
            style={{ textDecoration: "none", color: "#007bff" }}
          >
            {breadcrumbText}
          </a>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>{title}</span>
        </div>
      )}

      <h2>{title}</h2>

      {schema && schema.description && (
        <div
          className="schema-description"
          style={{ fontSize: "1.1em", color: "#555", marginBottom: "20px", lineHeight: "1.5" }}
          dangerouslySetInnerHTML={{ __html: marked.parse(schema.description) }}
        />
      )}

      {showRespec && (
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
          <div className="schema-url-box" style={{ marginBottom: "20px" }}>
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

          {/* Parameters for Patterns */}
          {isPattern && schema.parameters && (
            <div style={{ marginBottom: "20px" }}>
              <h3>Parameters</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {Object.entries(schema.parameters).map(([key, param]) => (
                  <li
                    key={key}
                    style={{
                      marginBottom: "12px",
                      background: "#f9f9f9",
                      padding: "12px",
                      borderRadius: "6px",
                    }}
                  >
                    <strong style={{ fontSize: "1.1em" }}>{param.name || key}</strong>
                    <span style={{ marginLeft: "8px", color: "#666", fontSize: "0.9em" }}>
                      ({param.in})
                    </span>
                    {param.schema && param.schema.type && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontFamily: "monospace",
                          color: "#c7254e",
                          background: "#f9f2f4",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {param.schema.type}
                      </span>
                    )}
                    {param.description && (
                      <div
                        style={{
                          marginTop: "6px",
                          color: "#333",
                          fontSize: "0.95em",
                          lineHeight: "1.5",
                        }}
                        dangerouslySetInnerHTML={{ __html: marked.parseInline(param.description) }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* RequestBodies for Patterns */}
          {isPattern && schema.requestBodies && (
            <div style={{ marginBottom: "20px" }}>
              <h3>Request Bodies</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {Object.entries(schema.requestBodies).map(([key, body]) => (
                  <li
                    key={key}
                    style={{
                      marginBottom: "12px",
                      background: "#f9f9f9",
                      padding: "12px",
                      borderRadius: "6px",
                    }}
                  >
                    <strong style={{ fontSize: "1.1em" }}>{key}</strong>
                    {body.required && (
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "#e11d48",
                          fontSize: "0.8em",
                          fontWeight: "bold",
                        }}
                      >
                        REQUIRED
                      </span>
                    )}
                    {body.description && (
                      <div
                        style={{
                          marginTop: "6px",
                          color: "#333",
                          fontSize: "0.95em",
                          lineHeight: "1.5",
                        }}
                        dangerouslySetInnerHTML={{ __html: marked.parseInline(body.description) }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Responses for Patterns */}
          {isPattern && schema.responses && (
            <div style={{ marginBottom: "20px" }}>
              <h3>Responses</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {Object.entries(schema.responses).map(([key, response]) => (
                  <li
                    key={key}
                    style={{
                      marginBottom: "12px",
                      background: "#f9f9f9",
                      padding: "12px",
                      borderRadius: "6px",
                    }}
                  >
                    <strong style={{ fontSize: "1.1em" }}>{key}</strong>
                    {(response.description || response.$ref) && (
                      <div
                        style={{
                          marginTop: "6px",
                          color: "#333",
                          fontSize: "0.95em",
                          lineHeight: "1.5",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: marked.parseInline(
                            response.description ||
                              `Referentie naar [${response.$ref}](${resolveRefLink(path, response.$ref)})`,
                          ),
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* UML Diagram */}
          {isSchema && (
            <>
              <h3>Diagram</h3>
              <div className="diagram-container">
                <UmlDiagram schema={schema} />
              </div>
            </>
          )}
        </>
      )}

      <h3>Ruwe Inhoud</h3>
      <pre className="raw-content">{content}</pre>
    </div>
  );
}
