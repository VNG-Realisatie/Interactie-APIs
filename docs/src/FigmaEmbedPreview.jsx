import React, { useEffect, useMemo, useState } from "react";
import { toFigmaEmbedSrc } from "./figmaEmbed";

const DEFAULT_FRAME_WIDTH = 1280;
/** Tall enough for page + footer; override per embed via data-figma-height. */
const DEFAULT_FRAME_HEIGHT = 2600;

export default function FigmaEmbedPreview({
  src,
  title = "Interactief prototype (Figma)",
  frameWidth = DEFAULT_FRAME_WIDTH,
  frameHeight = DEFAULT_FRAME_HEIGHT,
}) {
  const [fullscreen, setFullscreen] = useState(false);

  // No scaling param — Figma renders at frame size; preview crop is CSS-only.
  const embedSrc = useMemo(() => toFigmaEmbedSrc(src, { hideUi: true }), [src]);

  const width = Number.isFinite(frameWidth) ? frameWidth : DEFAULT_FRAME_WIDTH;
  const height = Number.isFinite(frameHeight) ? frameHeight : DEFAULT_FRAME_HEIGHT;
  const frameStyle = {
    "--figma-frame-width": `${width}px`,
    ...(fullscreen ? {} : { "--figma-frame-height": `${height}px` }),
  };

  useEffect(() => {
    if (!fullscreen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  if (!src) return null;

  return (
    <div className={`figma-prototype${fullscreen ? " is-fullscreen" : ""}`}>
      <div className="figma-prototype-header">
        <span className="figma-prototype-title">{title}</span>
        <div className="figma-prototype-actions">
          <a className="figma-prototype-open" href={src} target="_blank" rel="noopener noreferrer">
            Open in Figma
          </a>
          <button
            type="button"
            className="figma-prototype-action-btn"
            onClick={() => setFullscreen((value) => !value)}
          >
            {fullscreen ? "Sluiten" : "Volledig scherm"}
          </button>
        </div>
      </div>

      <div className="figma-prototype-viewport">
        <div
          className={`figma-prototype-scaler${fullscreen ? " figma-prototype-scaler--fullscreen" : " figma-prototype-scaler--preview"}`}
          style={frameStyle}
        >
          <iframe
            className="figma-prototype-frame"
            src={embedSrc}
            title={title}
            loading="lazy"
            tabIndex={fullscreen ? 0 : -1}
            allowFullScreen
          />
        </div>

        {!fullscreen && (
          <button
            type="button"
            className="figma-prototype-preview-overlay"
            onClick={() => setFullscreen(true)}
            aria-label="Bekijk prototype op volledig scherm"
          >
            <span className="figma-prototype-preview-btn">Bekijk prototype</span>
          </button>
        )}
      </div>
    </div>
  );
}
