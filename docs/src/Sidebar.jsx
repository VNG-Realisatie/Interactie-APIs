import React from "react";
import vngLogo from "./vng-logo.svg";

const issuesUrl = "https://github.com/VNG-Realisatie/Interactie-APIs/issues";

export default function Sidebar({ data, params, navigate }) {
  const go = (e, query) => {
    e.preventDefault();
    navigate(query);
  };

  return (
    <aside className="portal-sidebar">
      <h2>
        <a
          href="/"
          onClick={(e) => go(e, "")}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <img
            src={vngLogo}
            alt="VNG Logo"
            width="96"
            height="50"
            style={{ height: "32px", width: "auto" }}
          />
          Interactie APIs
        </a>
      </h2>
      <nav>
        <div className="nav-section">
          <ul>
            <li>
              <a href="/" onClick={(e) => go(e, "")}>
                Home
              </a>
            </li>
            <li>
              <a
                href="/?doc=docs/design-principles.md"
                onClick={(e) => go(e, "doc=docs/design-principles.md")}
              >
                Design Principes
              </a>
            </li>
            <li>
              <a href="/?doc=CONTRIBUTING.md" onClick={(e) => go(e, "doc=CONTRIBUTING.md")}>
                Bijdragen
              </a>
            </li>
          </ul>
        </div>

        {data && (
          <div className="nav-section">
            <h3>
              <a href="/?doc=docs/apis.md" onClick={(e) => go(e, "doc=docs/apis.md")}>
                API's
              </a>
            </h3>
            <ul>
              {data.apis.map((api, i) => {
                const defaultVersion =
                  api.versions.find((v) => v.version !== "next") || api.versions[0];
                const latestUrl = defaultVersion.url;
                return (
                  <li key={i} className="api-entry">
                    <a href={"/?url=" + latestUrl} onClick={(e) => go(e, "url=" + latestUrl)}>
                      {api.title}
                    </a>
                    <select
                      className="version-select"
                      value={params.url || latestUrl}
                      onChange={(e) => navigate("url=" + e.target.value)}
                    >
                      {api.versions.map((v, j) => (
                        <option key={j} value={v.url}>
                          {v.version}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {data && (
          <div className="nav-section">
            <h3>
              <a href="/?doc=docs/schemas.md" onClick={(e) => go(e, "doc=docs/schemas.md")}>
                Schema's
              </a>
            </h3>
            <ul>
              {data.schemas.map((s, i) => {
                const defaultVersion =
                  s.versions.find((v) => v.version !== "next") || s.versions[0];
                const latestPath = defaultVersion.path;
                return (
                  <li key={i} className="api-entry">
                    <a href={"/?file=" + latestPath} onClick={(e) => go(e, "file=" + latestPath)}>
                      {s.name}
                    </a>
                    <select
                      className="version-select"
                      value={params.file || latestPath}
                      onChange={(e) => navigate("file=" + e.target.value)}
                    >
                      {s.versions.map((v, j) => (
                        <option key={j} value={v.path}>
                          {v.version}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {data && (
          <div className="nav-section">
            <h3>
              <a href="/?doc=docs/patterns.md" onClick={(e) => go(e, "doc=docs/patterns.md")}>
                Patronen
              </a>
            </h3>
            <ul>
              {data.patterns.map((p, i) => {
                const defaultVersion =
                  p.versions.find((v) => v.version !== "next") || p.versions[0];
                const latestPath = defaultVersion.path;
                return (
                  <li key={i} className="api-entry">
                    <a href={"/?file=" + latestPath} onClick={(e) => go(e, "file=" + latestPath)}>
                      {p.name}
                    </a>
                    <select
                      className="version-select"
                      value={params.file || latestPath}
                      onChange={(e) => navigate("file=" + e.target.value)}
                    >
                      {p.versions.map((v, j) => (
                        <option key={j} value={v.path}>
                          {v.version}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>
      <div className="sidebar-footer">
        <a
          className="sidebar-footer-link"
          href={issuesUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.13-3.2.7-3.88-1.35-3.88-1.35-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.97.1-.75.4-1.26.72-1.55-2.56-.29-5.26-1.29-5.26-5.74 0-1.27.46-2.31 1.2-3.13-.12-.3-.52-1.49.12-3.11 0 0 .98-.31 3.2 1.2a11.1 11.1 0 0 1 5.82 0c2.22-1.52 3.2-1.2 3.2-1.2.64 1.62.24 2.81.12 3.11.75.82 1.2 1.86 1.2 3.13 0 4.46-2.7 5.45-5.28 5.73.42.36.78 1.05.78 2.13 0 1.54-.01 2.77-.01 3.15 0 .31.21.67.8.56a11.53 11.53 0 0 0 7.85-10.93C23.5 5.66 18.35.5 12 .5Z" />
          </svg>
          Praat mee op GitHub
        </a>
      </div>
    </aside>
  );
}
