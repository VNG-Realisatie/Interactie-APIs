import React from "react";

export default function HomeView({ data, navigate }) {
  const go = (e, query) => {
    e.preventDefault();
    navigate(query);
  };

  return (
    <div className="view-container">
      <h1>VNG Interactie APIs</h1>

      <p
        style={{
          fontSize: "1.1em",
          color: "var(--text-muted)",
          marginBottom: "2em",
          lineHeight: "1.6",
        }}
      >
        Deze website en <a href="https://github.com/vng-realisatie/interactie-apis">repository</a>{" "}
        zijn er om de verschillende API's van VNG samen te presenteren en te harmoniseren.
      </p>

      <h2>Portaal Features</h2>
      <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
        <li>
          <strong>Versiebeheer</strong>: Navigeer naadloos tussen verschillende versies van een
          specificatie via de branch-kiezer in de zijbalk.
        </li>
        <li>
          <strong>UML Diagrammen</strong>: Bekijk automatisch gegenereerde UML-style visuele
          diagrammen voor elk JSON Schema om de structuur, datatypes, en <code>$ref</code> relaties
          in één oogopslag te snappen.
        </li>
        <li>
          <strong>Interactieve REST Docs</strong>: Verken API specificaties met de ingebouwde
          Scalar-viewer om direct test requests te doen, rechtstreeks tegen de test- of mock-server.
        </li>
        <li>
          <strong>Lokale Mocking</strong>: Ontwikkelaars kunnen een lokale Prism-mock gateway
          draaien (op port <code>4010</code>) waarmee alle API definities lokaal en dynamisch mocked
          reageren.
        </li>
      </ul>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "2em",
        }}
      >
        <div className="card" style={{ padding: "24px" }}>
          <h2>
            <a
              href="/?doc=docs/apis.md"
              onClick={(e) => go(e, "doc=docs/apis.md")}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              API's
            </a>
          </h2>
          <p>
            Vind gestandaardiseerde definities voor diensten en webservices, geschreven in OpenAPI
            3.1. Deze bestanden beschrijven endpoints, parameters en responscodes, en verwijzen voor
            hun datamodellen naar de centrale Schemas.
          </p>
          <ul style={{ marginTop: "12px", paddingLeft: "20px" }}>
            {data &&
              data.apis.map((api, i) => (
                <li key={i}>
                  <a
                    href={"/?url=" + api.versions[0].url}
                    onClick={(e) => go(e, "url=" + api.versions[0].url)}
                  >
                    {api.title}
                  </a>
                </li>
              ))}
          </ul>
        </div>

        <div className="card" style={{ padding: "24px" }}>
          <h2>
            <a
              href="/?doc=docs/schemas.md"
              onClick={(e) => go(e, "doc=docs/schemas.md")}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Schema's
            </a>
          </h2>
          <p>
            De herbruikbare datamodellen van de gemeentelijke architectuur, vastgelegd in JSON
            Schema. Begrippen zoals <code>Zaak</code>, <code>Adres</code>, en <code>Document</code>{" "}
            zijn hier één keer centraal ontworpen, om wildgroei en inconsistenties te voorkomen.
          </p>
          <ul style={{ marginTop: "12px", paddingLeft: "20px" }}>
            {data &&
              data.schemas.map((s, i) => (
                <li key={i}>
                  <a
                    href={"/?file=" + s.versions[0].path}
                    onClick={(e) => go(e, "file=" + s.versions[0].path)}
                  >
                    {s.name}
                  </a>
                </li>
              ))}
          </ul>
        </div>

        <div className="card" style={{ padding: "24px" }}>
          <h2>
            <a
              href="/?doc=docs/patterns.md"
              onClick={(e) => go(e, "doc=docs/patterns.md")}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Patronen
            </a>
          </h2>
          <p>
            Standaardoplossingen voor veelvoorkomende API ontwerpvraagstukken. Hoe verwerken we
            foutmeldingen? Hoe werkt paginering? Door deze patronen centraal te definiëren en her te
            gebruiken, creëren we een uniforme ervaring voor alle afnemers.
          </p>
          <ul style={{ marginTop: "12px", paddingLeft: "20px" }}>
            {data &&
              data.patterns.map((p, i) => (
                <li key={i}>
                  <a
                    href={"/?file=" + p.versions[0].path}
                    onClick={(e) => go(e, "file=" + p.versions[0].path)}
                  >
                    {p.name}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
