import React from 'react';

export default function HomeView() {
  return (
    <div className="view-container">
      <h1>Welkom</h1>
      <p>
        Dit is het centrale portaal voor de API-standaarden van VNG. Gebruik het menu aan de linkerkant om
        specificaties, schemas en documentatie te bekijken.
      </p>
      <div className="card">
        <h2>Recente Wijzigingen</h2>
        <p>Nieuwe semver-benadering voor schemas geïmplementeerd.</p>
      </div>
    </div>
  );
}
