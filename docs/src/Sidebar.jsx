import React from 'react';
import vngLogo from './vng-logo.svg';

export default function Sidebar({ data, params, navigate }) {
  const go = (e, query) => {
    e.preventDefault();
    navigate(query);
  };

  return (
    <aside className="portal-sidebar">
      <h2>
        <a href="/" onClick={(e) => go(e, '')} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={vngLogo} alt="VNG Logo" width="96" height="50" style={{ height: '32px', width: 'auto' }} />
          API Portal
        </a>
      </h2>
      <nav>
        <div className="nav-section">
          <h3>Algemeen</h3>
          <ul>
            <li><a href="/" onClick={(e) => go(e, '')}>Home</a></li>
            <li><a href="/?doc=docs/design-principles.md" onClick={(e) => go(e, 'doc=docs/design-principles.md')}>API Portal Design Principes</a></li>
            <li><a href="/?doc=CONTRIBUTING.md" onClick={(e) => go(e, 'doc=CONTRIBUTING.md')}>Bijdragen</a></li>
          </ul>
        </div>

        {data && (
          <div className="nav-section">
            <h3>
              <a href="/?doc=docs/apis.md" onClick={(e) => go(e, 'doc=docs/apis.md')}>APIs (OpenAPI)</a>
            </h3>
            <ul>
              {data.apis.map((api, i) => {
                const latestUrl = api.versions[0].url;
                return (
                  <li key={i} className="api-entry">
                    <a href={'/?url=' + latestUrl} onClick={(e) => go(e, 'url=' + latestUrl)}>
                      {api.title}
                    </a>
                    <select
                      className="version-select"
                      value={params.url || latestUrl}
                      onChange={(e) => navigate('url=' + e.target.value)}
                    >
                      {api.versions.map((v, j) => (
                        <option key={j} value={v.url}>{v.version}</option>
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
              <a href="/?doc=docs/schemas.md" onClick={(e) => go(e, 'doc=docs/schemas.md')}>Schemas (JSON)</a>
            </h3>
            <ul>
              {data.schemas.map((s, i) => {
                const latestPath = s.versions[0].path;
                return (
                  <li key={i} className="api-entry">
                    <a href={'/?file=' + latestPath} onClick={(e) => go(e, 'file=' + latestPath)}>
                      {s.name}
                    </a>
                    <select
                      className="version-select"
                      value={params.file || latestPath}
                      onChange={(e) => navigate('file=' + e.target.value)}
                    >
                      {s.versions.map((v, j) => (
                        <option key={j} value={v.path}>{v.version}</option>
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
              <a href="/?doc=docs/patterns.md" onClick={(e) => go(e, 'doc=docs/patterns.md')}>Patronen</a>
            </h3>
            <ul>
              {data.patterns.map((p, i) => {
                const latestPath = p.versions[0].path;
                return (
                  <li key={i} className="api-entry">
                    <a href={'/?file=' + latestPath} onClick={(e) => go(e, 'file=' + latestPath)}>
                      {p.name}
                    </a>
                    <select
                      className="version-select"
                      value={params.file || latestPath}
                      onChange={(e) => navigate('file=' + e.target.value)}
                    >
                      {p.versions.map((v, j) => (
                        <option key={j} value={v.path}>{v.version}</option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
