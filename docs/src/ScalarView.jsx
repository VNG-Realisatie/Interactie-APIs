import React, { useEffect, useMemo, useRef, useState } from "react";
import yaml from "js-yaml";
import ResourceTopBar from "./ResourceTopBar";

function getSchemaUrl(url) {
  if (/^https?:\/\//.test(url)) return url;
  const origin = new URL(window.location.origin);
  if (origin.hostname === "localhost" || origin.hostname === "127.0.0.1") {
    origin.hostname = "host.docker.internal";
  }
  return `${origin.toString().replace(/\/$/, "")}${url}`;
}

function getPathParameterNames(pathTemplate, operation = {}) {
  const names = new Set();
  for (const match of pathTemplate.matchAll(/\{([^}]+)\}/g)) {
    names.add(match[1]);
  }

  for (const parameter of operation.parameters || []) {
    if (parameter?.in === "path" && parameter.name) {
      names.add(parameter.name);
    }
  }

  return [...names];
}

function getFirstPathExample(spec) {
  if (!spec?.paths) return null;

  for (const [pathTemplate, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    const pathLevelNames = getPathParameterNames(pathTemplate, pathItem);
    if (pathLevelNames.length > 0) {
      return { pathTemplate, parameterNames: pathLevelNames };
    }

    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") continue;

      const parameterNames = getPathParameterNames(pathTemplate, operation);
      if (parameterNames.length > 0) {
        return { pathTemplate, parameterNames };
      }
    }
  }

  return null;
}

function needsAuthorizationHeader(spec) {
  const schemes = Object.values(spec?.components?.securitySchemes || {});
  return schemes.some((scheme) => {
    if (!scheme || typeof scheme !== "object") return false;
    return (
      scheme.type === "oauth2" ||
      scheme.type === "openIdConnect" ||
      (scheme.type === "http" && ["bearer", "basic"].includes(scheme.scheme)) ||
      (scheme.type === "apiKey" && scheme.in === "header")
    );
  });
}

function addMockBearerAuth(spec) {
  if (!spec || !needsAuthorizationHeader(spec)) return spec;

  const mockSpec = structuredClone(spec);
  mockSpec.components = mockSpec.components || {};
  mockSpec.components.securitySchemes = {
    ...mockSpec.components.securitySchemes,
    mockBearer: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "mock-token",
      description:
        "Alleen voor de lokale Prism mock. Gebruik een willekeurige bearer token, bijvoorbeeld `test-token`.",
    },
  };
  mockSpec.security = [{ mockBearer: [] }, ...(Array.isArray(mockSpec.security) ? mockSpec.security : [])];

  return mockSpec;
}

function buildDockerCommand(schemaUrl, pathExample, includeAuthHeader) {
  const lines = [
    "docker run --rm schemathesis/schemathesis:stable run \\",
    `  ${schemaUrl} \\`,
    "  --url https://jouw-api.example.nl \\",
  ];

  if (includeAuthHeader) {
    lines.push('  --header "Authorization: Bearer JOUW_TOKEN" \\');
  }

  if (pathExample) {
    lines.push(`  --include-path "${pathExample.pathTemplate}" \\`);
  }

  lines.push("  --mode positive \\");
  lines.push("  --max-examples 5 \\");
  lines.push("  --generation-deterministic \\");
  lines.push("  --phases examples,fuzzing");

  return lines.join("\n");
}

function getRespecBaseName(url, version) {
  const sourcePath = version?.sourceUrl || url.replace("/docs/bundled/", "/").replace(/_/g, "/");
  return sourcePath
    .replace(/^\/?apis\//, "")
    .replace(/^\/+/, "")
    .replace(/\.(json|yaml|yml)$/, "")
    .replace(/\//g, "_");
}

export default function ScalarView({ url, portalData, navigate }) {
  const containerRef = useRef(null);
  const [spec, setSpec] = useState(null);
  const [scalarContent, setScalarContent] = useState(null);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Kopieren");

  const schemaUrl = getSchemaUrl(url);
  const apiEntry = useMemo(
    () => portalData?.apis?.find((api) => api.versions.some((version) => version.url === url)),
    [portalData, url],
  );
  const currentVersion = apiEntry?.versions.find((version) => version.url === url);
  const respecBaseName = getRespecBaseName(url, currentVersion);
  const respecHtml = `/docs/respec/${respecBaseName}.html`;
  const respecPdf = `/docs/respec/${respecBaseName}.pdf`;
  const fallbackTitle = respecBaseName || url.split("/").pop()?.replace(/\.(json|yaml|yml)$/, "");
  const apiTitle = spec?.info?.title || apiEntry?.title || fallbackTitle;
  const versionLabel = currentVersion?.version || spec?.info?.version || "current";
  const apiVersions = (apiEntry?.versions || [{ version: versionLabel, url }]).map((version) => ({
    label: version.version,
    value: version.url,
  }));
  const pathExample = useMemo(() => getFirstPathExample(spec), [spec]);
  const includeAuthHeader = useMemo(() => needsAuthorizationHeader(spec), [spec]);
  const dockerCommand = useMemo(
    () => buildDockerCommand(schemaUrl, pathExample, includeAuthHeader),
    [schemaUrl, pathExample, includeAuthHeader],
  );

  useEffect(() => {
    setSpec(null);
    setScalarContent(null);
    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        const parsed = url.endsWith(".json") ? JSON.parse(text) : yaml.load(text);
        setSpec(parsed);
        setScalarContent(yaml.dump(addMockBearerAuth(parsed), { lineWidth: -1 }));
      })
      .catch((error) => {
        console.error("Fout bij laden OpenAPI spec voor testinstructies:", error);
      });
  }, [url]);

  useEffect(() => {
    if (!scalarContent) return undefined;

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
    script.onload = () => {
      if (window.Scalar && containerRef.current) {
        containerRef.current.innerHTML = "";

        // Bereken de lokale mock URL op basis van het spec-pad
        // De Portal laadt gebundelde specs via /docs/bundled/path_to_spec_v1.0.0.json
        // We moeten dit terugvertalen naar het pad dat de mock gateway verwacht.
        let mockPath = url
          .replace("/docs/bundled/", "/")
          .replace(/_/g, "/")
          .replace(/\.(json|yaml|yml)$/, "");

        // Zorg dat het pad begint met /apis (indien niet al het geval door de underscore vervanging)
        if (!mockPath.startsWith("/apis")) {
          mockPath = "/apis" + mockPath;
        }

        const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
        const mockServerUrl = isLocal
          ? `http://127.0.0.1:4010${mockPath}`
          : `https://vng-interactie-mocks.fly.dev${mockPath}`;

        window.Scalar.createApiReference(containerRef.current, {
          content: scalarContent,
          theme: "purple",
          showSidebar: true,
          defaultOpenAllTags: true,
          defaultModelsExpandDepth: 10,
          expandAllModelSections: true,
          authentication: {
            preferredSecurityScheme: needsAuthorizationHeader(spec) ? "mockBearer" : undefined,
            securitySchemes: {
              mockBearer: {
                token: "test-token",
              },
            },
          },
          servers: [
            {
              url: mockServerUrl,
              description: "Lokale Mock Server (Gateway)",
            },
          ],
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [url, spec, scalarContent]);

  useEffect(() => {
    if (!isTestDialogOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsTestDialogOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isTestDialogOpen]);

  const copyDockerCommand = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard
      .writeText(dockerCommand)
      .then(() => {
        setCopyLabel("Gekopieerd");
        window.setTimeout(() => setCopyLabel("Kopieren"), 1500);
      })
      .catch(() => {});
  };

  return (
    <div className="api-view">
      <ResourceTopBar
        kind="API"
        title={apiTitle}
        versionLabel={versionLabel}
        versions={apiVersions}
        currentValue={url}
        onVersionChange={(value) => navigate(`url=${value}`)}
        actions={
          <>
          <a className="api-doc-link" href={respecHtml} target="_blank" rel="noopener noreferrer">
            HTML
          </a>
          <a className="api-doc-link" href={respecPdf} target="_blank" rel="noopener noreferrer">
            PDF
          </a>
          <button
            type="button"
            className="api-test-button"
            onClick={() => setIsTestDialogOpen(true)}
            title="Toon Schemathesis contracttest commando"
          >
            <span aria-hidden="true">ST</span>
            Contract testen
          </button>
          </>
        }
      />
      {isTestDialogOpen && (
        <div className="api-dialog-backdrop" onMouseDown={() => setIsTestDialogOpen(false)}>
          <section
            className="api-test-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-test-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="api-test-dialog-header">
              <div>
                <h2 id="api-test-dialog-title">Automatisch testen</h2>
                <p>
                  Gebruik deze Schemathesis one-liner als startpunt voor contracttests tegen je
                  implementatie. Schemathesis genereert geldige path-waarden uit de OpenAPI schemas.
                </p>
              </div>
              <button
                type="button"
                className="api-dialog-close"
                onClick={() => setIsTestDialogOpen(false)}
                aria-label="Sluit testinstructies"
                title="Sluiten"
              >
                x
              </button>
            </div>
            <pre className="api-command-block">
              <code>{dockerCommand}</code>
            </pre>
            {pathExample ? (
              <p className="api-test-note">
                Vervang <code>https://jouw-api.example.nl</code>
                {includeAuthHeader ? (
                  <>
                    {" "}
                    en <code>JOUW_TOKEN</code>
                  </>
                ) : null}
                . Deze opdracht beperkt de test tot <code>{pathExample.pathTemplate}</code>.
              </p>
            ) : (
              <p className="api-test-note">
                Vervang <code>https://jouw-api.example.nl</code>
                {includeAuthHeader ? (
                  <>
                    {" "}
                    en <code>JOUW_TOKEN</code>
                  </>
                ) : null}{" "}
                door waarden uit je testomgeving.
              </p>
            )}
            <div className="api-dialog-actions">
              <button type="button" className="api-copy-button" onClick={copyDockerCommand}>
                {copyLabel}
              </button>
              <button
                type="button"
                className="api-secondary-button"
                onClick={() => setIsTestDialogOpen(false)}
              >
                Sluiten
              </button>
            </div>
          </section>
        </div>
      )}
      <div ref={containerRef} className="scalar-container">
        Laden...
      </div>
    </div>
  );
}
