import React, { useEffect, useState } from "react";

export default function ResourceTopBar({
  kind,
  title,
  versionLabel,
  versions = [],
  currentValue,
  onVersionChange,
  actions,
}) {
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const hasVersions = versions.length > 1;

  useEffect(() => {
    if (!isVersionMenuOpen) return undefined;

    const closeMenu = () => setIsVersionMenuOpen(false);
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isVersionMenuOpen]);

  return (
    <div className="api-topbar">
      <div className="api-topbar-main">
        <div className="api-topbar-title">
          <span className="api-topbar-kicker">{kind}</span>
          <h1>{title}</h1>
        </div>
        <div className="api-version-control" onClick={(event) => event.stopPropagation()}>
          <span>Versie</span>
          <button
            type="button"
            className="api-version-button"
            onClick={() => setIsVersionMenuOpen((value) => !value)}
            aria-haspopup="listbox"
            aria-expanded={isVersionMenuOpen}
            disabled={!hasVersions}
          >
            {versionLabel}
          </button>
          {isVersionMenuOpen && hasVersions ? (
            <div className="api-version-menu" role="listbox" aria-label={`${kind} versie`}>
              {versions.map((version) => (
                <button
                  key={version.value}
                  type="button"
                  role="option"
                  aria-selected={version.value === currentValue}
                  className={version.value === currentValue ? "is-active" : undefined}
                  onClick={() => {
                    setIsVersionMenuOpen(false);
                    onVersionChange(version.value);
                  }}
                >
                  {version.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {actions ? <div className="api-topbar-actions">{actions}</div> : null}
    </div>
  );
}
