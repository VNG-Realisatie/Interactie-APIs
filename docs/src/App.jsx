import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import HomeView from './HomeView';
import MarkdownView from './MarkdownView';
import FileView from './FileView';
import ScalarView from './ScalarView';

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    url: params.get('url'),
    doc: params.get('doc'),
    file: params.get('file'),
  };
}

export default function App() {
  const [portalData, setPortalData] = useState(null);
  const [params, setParams] = useState(getParams());

  useEffect(() => {
    fetch('/docs/portal-data.json')
      .then(r => r.json())
      .then(setPortalData)
      .catch(e => console.error('Fout bij laden portaal data:', e));

    const onPop = () => setParams(getParams());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (query) => {
    window.history.pushState(null, '', '/?' + query);
    setParams(getParams());
  };

  let view;
  if (params.url) {
    view = <ScalarView url={params.url} />;
  } else if (params.doc) {
    view = <MarkdownView path={params.doc} portalData={portalData} />;
  } else if (params.file) {
    view = <FileView path={params.file} portalData={portalData} />;
  } else {
    view = <HomeView data={portalData} navigate={navigate} />;
  }

  return (
    <>
      <Sidebar data={portalData} params={params} navigate={navigate} />
      <main>{view}</main>
    </>
  );
}
