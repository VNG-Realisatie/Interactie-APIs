import React, { useEffect, useRef } from 'react';

export default function ScalarView({ url }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference';
    script.onload = () => {
      if (window.Scalar && containerRef.current) {
        containerRef.current.innerHTML = '';
        window.Scalar.createApiReference(containerRef.current, {
          url,
          theme: 'purple',
          showSidebar: true,
          defaultOpenAllTags: true,
          defaultModelsExpandDepth: 10,
          expandAllModelSections: true,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [url]);

  return <div ref={containerRef} className="scalar-container">Laden...</div>;
}
