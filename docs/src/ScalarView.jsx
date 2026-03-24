import React, { useEffect, useRef } from "react";

export default function ScalarView({ url }) {
  const containerRef = useRef(null);

  const fileName = url
    .split("/")
    .pop()
    .replace(/\.(json|yaml|yml)$/, "");
  const respecHtml = `/docs/respec/${fileName}.html`;
  const respecPdf = `/docs/respec/${fileName}.pdf`;

  useEffect(() => {
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

        const mockServerUrl = `http://127.0.0.1:4010${mockPath}`;

        window.Scalar.createApiReference(containerRef.current, {
          url,
          theme: "purple",
          showSidebar: true,
          defaultOpenAllTags: true,
          defaultModelsExpandDepth: 10,
          expandAllModelSections: true,
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
  }, [url]);

  return (
    <div className="view-container">
      <div
        style={{
          padding: "10px 20px",
          background: "#f8f9fa",
          borderBottom: "1px solid #eee",
        }}
      >
        <strong>ReSpec Documentatie: </strong>
        <a href={respecHtml} target="_blank" rel="noopener noreferrer">
          HTML
        </a>
        {" | "}
        <a href={respecPdf} target="_blank" rel="noopener noreferrer">
          PDF
        </a>
      </div>
      <div ref={containerRef} className="scalar-container">
        Laden...
      </div>
    </div>
  );
}
