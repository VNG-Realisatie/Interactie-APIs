import React, { useCallback, useEffect, useState } from "react";

// Tijdelijk: de conformance-function draait nog op de MijnOverheid-demo-site.
// Verhuist later naar een function op de portal-site zelf.
const CONFORMANCE_ENDPOINT =
  import.meta.env.VITE_CONFORMANCE_ENDPOINT ||
  "https://mijnoverheid-chat.netlify.app/.netlify/functions/conformance";

const APIS = [
  { key: "taken", label: "MijnTaken" },
  { key: "zaken", label: "MijnZaken" },
  { key: "producten", label: "MijnProducten" },
  { key: "agenda", label: "MijnAgenda" },
  { key: "gesprekken", label: "MijnGesprekken" },
];

function scoreClass(percent) {
  return percent === 100 ? "ok" : percent >= 50 ? "warn" : "bad";
}

export default function ConformanceView() {
  const [vendor, setVendor] = useState("");
  const [api, setApi] = useState("taken");
  const [baseUrl, setBaseUrl] = useState(
    "https://vng-interactie-mocks.fly.dev/apis/rest/taken/next",
  );
  const [testing, setTesting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);

  const call = (payload) =>
    fetch(CONFORMANCE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json());

  const loadRecords = useCallback(() => {
    call({ action: "list" })
      .then((d) => setRecords(d.records || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const onApiChange = (next) => {
    setApi(next);
    setBaseUrl(`https://vng-interactie-mocks.fly.dev/apis/rest/${next}/next`);
    setResult(null);
  };

  const runTest = async () => {
    setError(null);
    setResult(null);
    setTesting(true);
    try {
      const r = await call({ action: "test", api, baseUrl });
      if (r.error) setError(`Test mislukte: ${r.error}`);
      else setResult(r);
    } catch (e) {
      setError(e?.message || "Test mislukte.");
    } finally {
      setTesting(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const r = await call({ action: "publish", vendor: vendor || "Onbekende leverancier", api, baseUrl });
      if (r.record) {
        setResult(r.record);
        loadRecords();
      } else setError("Publiceren mislukte.");
    } catch (e) {
      setError(e?.message || "Publiceren mislukte.");
    } finally {
      setPublishing(false);
    }
  };

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  };

  return (
    <div className="view-container">
      <h1>Conformiteit voor leveranciers</h1>
      <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5em" }}>
        Sluit je eigen implementatie aan op de Interactie-API-contracten. We testen je endpoint{" "}
        <strong>server-side</strong> tegen het verwachte schema en je kunt de uitslag in het
        openbare register publiceren. Voor diepe fuzzing gebruik je de{" "}
        <strong>Contract testen</strong>-knop (Schemathesis) op een API-pagina.
      </p>

      <section className="conf-card">
        <h2>Test je API</h2>
        <div className="conf-form">
          <label>
            <span>Leverancier</span>
            <input
              type="text"
              placeholder="Naam van je organisatie"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </label>
          <label>
            <span>API</span>
            <select value={api} onChange={(e) => onApiChange(e.target.value)}>
              {APIS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="conf-form-url">
            <span>Base-URL van je API</span>
            <input
              type="url"
              placeholder="https://uw-api.nl/apis/rest/taken/next"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </label>
        </div>
        <div className="conf-actions">
          <button type="button" className="api-test-button" onClick={runTest} disabled={testing}>
            {testing ? "Bezig met testen…" : "Test conformiteit"}
          </button>
          {result && (
            <button
              type="button"
              className="api-secondary-button"
              onClick={publish}
              disabled={publishing}
            >
              {publishing ? "Publiceren…" : "Publiceer in register"}
            </button>
          )}
        </div>
        {error && <div className="conf-error">{error}</div>}

        {result && (
          <div className="conf-result">
            <div className={`conf-score conf-score-${scoreClass(result.score.percent)}`}>
              <strong>{result.score.percent}%</strong>
              <span>
                {result.score.passed}/{result.score.total} checks geslaagd · {result.label}
              </span>
            </div>
            {result.ops.map((op) => {
              const badge = op.skipped ? "–" : op.pass ? "✓" : "✗";
              const cls = op.skipped ? "is-skip" : op.pass ? "is-pass" : "is-fail";
              return (
                <div key={op.name} className={`conf-op${op.skipped ? " is-skipped" : ""}`}>
                  <span className={`conf-op-badge ${cls}`}>{badge}</span>
                  <span className="conf-op-body">
                    <strong>{op.name}</strong>
                    {op.skipped ? (
                      <small>{op.note}</small>
                    ) : (
                      <small>
                        HTTP {op.status || "—"} · schema {op.schemaValid ? "valide" : "ongeldig"} ·{" "}
                        {op.latencyMs} ms
                        {op.negative
                          ? ` · foutscenario ${op.negative.rejected ? "afgewezen ✓" : "niet afgewezen ✗"}`
                          : ""}
                      </small>
                    )}
                    {op.violations?.length > 0 && (
                      <ul className="conf-violations">
                        {op.violations.map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="conf-card">
        <h2>Register ({records.length})</h2>
        {records.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nog geen inzendingen. Wees de eerste.</p>
        ) : (
          <div className="conf-register">
            {records.map((r) => (
              <div key={r.id} className="conf-row">
                <span className="conf-row-vendor">{r.vendor}</span>
                <span className="conf-row-api">
                  {APIS.find((a) => a.key === r.api)?.label || r.api}
                </span>
                <span className={`conf-row-score conf-score-${scoreClass(r.score.percent)}`}>
                  {r.score.percent}%
                </span>
                <span className="conf-row-date">{fmtDate(r.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
