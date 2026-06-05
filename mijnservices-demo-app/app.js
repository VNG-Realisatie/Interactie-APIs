import { takenSeed } from "./data/taken-seed.mjs";

const app = document.querySelector("#app");
const breadcrumbs = document.querySelector(".breadcrumbs");
const navButtons = [...document.querySelectorAll(".side-nav button")];
const modalBackdrop = document.querySelector(".modal-backdrop");
const filterPanel = document.querySelector(".filter-panel");
const closeFilterButton = document.querySelector(".close-filter");
const applyFilterButton = document.querySelector(".apply-filter");
const siteSearch = document.querySelector(".site-search");

const cases = [
  [
    "Aanvraag subsidie geluidsisolatie",
    "17-10-2024",
    "Open",
    "Uw aanvraag is ontvangen. De gemeente beoordeelt de offerte en de ligging van de woning.",
  ],
  [
    "Wmo-melding",
    "29-9-2024",
    "Open",
    "Een medewerker neemt contact op voor een keukentafelgesprek.",
  ],
  [
    "Opzeggen parkeervergunning",
    "5-12-2023",
    "Open",
    "De vergunning loopt door tot de einddatum van de huidige betaalperiode.",
  ],
  [
    "Aanvraag afkoop canon Keukenlaan 133",
    "5-12-2023",
    "Open",
    "De aanvraag ligt bij erfpacht voor berekening van de afkoopsom.",
  ],
  [
    "Adres onderzoek",
    "5-12-2023",
    "Open",
    "Wij controleren of de gegevens in de basisregistratie kloppen.",
  ],
  [
    "Bezwaar tegen waardering onroerende zaken",
    "5-12-2023",
    "Open",
    "Het bezwaar is in behandeling bij de taxateur.",
  ],
  [
    "Aanvraag vakantieverhuur Dierenselaan 88",
    "5-12-2023",
    "Gesloten",
    "De melding is afgehandeld en toegevoegd aan uw overzicht.",
  ],
  ["Aanvraag mantelzorg parkeervergunning", "5-12-2023", "Gesloten", "De vergunning is afgegeven."],
  ["Aanvraag parkeervergunning", "5-12-2023", "Gesloten", "De aanvraag is afgerond."],
  [
    "Verhuizing doorgeven",
    "3-11-2023",
    "Gesloten",
    "De verhuizing is verwerkt in de basisregistratie.",
  ],
  ["Evenementenvergunning buurtfeest", "14-8-2023", "Gesloten", "De vergunning is verleend."],
  [
    "Melding openbare ruimte",
    "2-6-2023",
    "Gesloten",
    "De melding is afgehandeld door de buitendienst.",
  ],
];

const tasks = [
  ["Geef informatie voor uw aanvraag subsidie geluidsisolatie", "Nog 2 dagen", true],
  [
    "Betaal uw parkeerbon van € 74,90 voor parkeren bij Valeriusplein",
    "vóór 21 oktober 2023",
    false,
  ],
  [
    "Betaal uw Erfpachtfactuur van € 27,52 voor Keukenhoflaan 133 voor de periode juli tot en met december 2023",
    "vóór 12 december 2023",
    false,
  ],
  ["Aanleveren extra documenten adres onderzoek", "", false],
];

const messages = [
  [
    "Herinnering: Informatie geven voor uw aanvraag subsidie geluidsisolatie",
    "Vandaag",
    true,
    "Ontvangen vandaag om 09:12 uur",
  ],
  ["Betalen van uw parkeerbon", "15-5-2025", true, "Ontvangen op 15 mei 2025 om 18:10 uur"],
  [
    "Vernieuwen identiteitskaart",
    "22-9-2024",
    false,
    "Ontvangen op 22 september 2024 om 10:31 uur",
  ],
  [
    "Tip: betaal bedragen met automatische incasso",
    "1-5-2024",
    false,
    "Ontvangen op 1 mei 2024 om 12:02 uur",
  ],
];

const products = [
  ["Erfpachtcontract", "Keukenhoflaan 133", "Erfpacht", "#erfpacht/contract"],
  ["Verhuurontheffing", "Dierenselaan 88", "Vakantieverhuur", "#vakantieverhuur/vergunning"],
  ["Parkeervergunning bewoners", "34-FJT-23", "Parkeren", "#parkeren"],
  ["Parkeerbon", "34-FJT-23", "Parkeren", "#parkeren"],
];

const taxTasks = [
  ["Betaal uw gemeentelijke belasting van € 6.982,30", "vóór 1 maart 2024"],
  [
    "Betaal uw rioolrecht grootafvoer van € 211,30 voor aanslagnummer 2212002751",
    "vóór 1 april 2024",
  ],
  ["Geef meer informatie over uw bezwaar tegen afvalstoffenheffing 2024", "vóór 2 juni 2024"],
];

const taxActions = [
  "Bezwaar maken tegen een aanslag",
  "Downloaden van meerdere documenten in één keer",
  "Belasting gespreid betalen met automatische incasso",
  "Betalingsregeling aanvragen",
];

const taxAssessments = [
  ["2023", "2301928384", "Gemeentelijke belastingen", "€ 6.982,30", "€ 6.982,30"],
  ["2022", "2402832373", "Rioolrecht grootafvoer", "€ 211,30", "€ 211,30"],
  ["2022", "2301928384", "Gemeentelijke belastingen", "€ 5.433,54", "€ 0,00"],
  ["2021", "2101057800", "Gemeentelijke belastingen", "€ 735,90", "€ 0,00"],
];

const groundLeaseInvoices = [
  ["Juli t/m december 2023", "€ 732,43", "€ 101,20"],
  ["Januari t/m juni 2023", "€ 732,43", "€ 0,00"],
  ["Juli t/m december 2022", "€ 732,43", "€ 0,00"],
  ["Januari t/m juni 2022", "€ 732,43", "€ 0,00"],
  ["Juli t/m december 2021", "€ 732,43", "€ 0,00"],
  ["Januari t/m juni 2021", "€ 732,43", "€ 0,00"],
  ["Juli t/m december 2020", "€ 732,43", "€ 0,00"],
  ["Januari t/m juni 2020", "€ 732,43", "€ 0,00"],
  ["Juli t/m december 2019", "€ 732,43", "€ 0,00"],
];

const documents = [
  ["example3", "png", "2000 kB", "31-8-2024", "Door u geupload"],
  ["Ontvangstbevestiging", "pdf", "116 kB", "17-10-2022", "Van de gemeente"],
  ["Rapport geluidsonderzoek", "pdf", "854 kB", "5-1-2023", "Van de gemeente"],
  ["Offerte woningverbetering", "pdf", "430 kB", "12-1-2023", "Door u geupload"],
  ["Besluit subsidie", "pdf", "230 kB", "29-9-2023", "Van de gemeente"],
];

const themeData = {
  woz: {
    title: "WOZ",
    tasks: [["Geef meer informatie over uw WOZ-bezwaar", "vóór 2 juni 2024"]],
    actions: [
      "WOZ-waarde bekijken",
      "Bezwaar maken tegen WOZ-waarde",
      "Taxatieverslag downloaden",
      "Adresgegevens controleren",
    ],
    cases: [5],
    itemsTitle: "WOZ-objecten",
    items: [
      ["Keukenlaan 133", "WOZ-waarde 2024", "€ 438.000"],
      ["Garagebox Valeriusplein", "WOZ-waarde 2024", "€ 34.000"],
      ["Keukenlaan 133", "WOZ-waarde 2023", "€ 412.000"],
      ["Keukenlaan 133", "WOZ-waarde 2022", "€ 389.000"],
    ],
  },
  parkeren: {
    title: "Parkeren",
    tasks: [
      ["Betaal uw parkeerbon van € 74,90 voor parkeren bij Valeriusplein", "vóór 1 maart 2023"],
    ],
    actions: [
      "Parkeervergunning aanvragen",
      "Kenteken wijzigen",
      "Parkeerbon betalen",
      "Mantelzorgvergunning aanvragen",
    ],
    cases: [2, 7, 8],
    itemsTitle: "Parkeerproducten",
    items: [
      ["Parkeervergunning bewoners", "34-FJT-23", "Actief"],
      ["Parkeerbon", "34-FJT-23", "Nog te betalen"],
      ["Mantelzorgvergunning", "Keukenlaan 133", "Verleend"],
      ["Bezoekersregeling", "Zone Centrum", "Actief"],
    ],
  },
  erfpacht: {
    title: "Erfpacht",
    tasks: [
      [
        "Betaal uw Erfpachtfactuur van € 27,52 voor Keukenhoflaan 133 voor de periode juli tot en met december 2023",
        "vóór 12 december 2023",
      ],
    ],
    actions: [
      "Erfpachtcanon bekijken",
      "Afkoop canon aanvragen",
      "Erfpachtcontract downloaden",
      "Adres erfpachtobject wijzigen",
    ],
    cases: [3],
    itemsTitle: "Erfpachtcontracten",
    items: [
      ["Keukenlaan 133", "Contract 2023", "1 taak open"],
      ["Keukenlaan 133", "Factuur juli-december", "Nog te betalen"],
      ["Keukenlaan 133", "Afkoopberekening", "In behandeling"],
      ["Keukenlaan 133", "Canon overzicht", "Beschikbaar"],
    ],
  },
  vakantieverhuur: {
    title: "Vakantieverhuur",
    tasks: [],
    actions: [
      "Vakantieverhuur melden",
      "Nachtteller bekijken",
      "Melding wijzigen",
      "Voorwaarden vakantieverhuur bekijken",
    ],
    cases: [6],
    itemsTitle: "Meldingen vakantieverhuur",
    items: [
      ["Dierenselaan 88", "Melding 2024", "Afgehandeld"],
      ["Dierenselaan 88", "Nachtteller", "18 nachten gebruikt"],
      ["Dierenselaan 88", "Voorwaarden", "Beschikbaar"],
      ["Dierenselaan 88", "Correspondentie", "2 berichten"],
    ],
  },
};

// --- MijnPlannen -----------------------------------------------------------
// Demo van een takenlijst voor het regelen van zaken na een overlijden.
// De data is bewust gemodelleerd naar het MijnTaken-contract (TaakSamenvatting:
// uuid, titel.nl, toelichting.nl, status, deadline, uitvoering). Het enige
// extra veld is `organisatie`; in een echte MijnTaken-koppeling volgt dat uit
// de provider/context. Zo is deze statische lijst later 1-op-1 te vervangen
// door `POST /context/zoek`-resultaten.

// De 12 organisaties uit de correspondentiestroom-inventarisatie (Aanpak Levensgebeurtenissen).
const organisaties = {
  gemeente: { naam: "Gemeente", kort: "Gemeente" },
  belastingdienst: { naam: "Belastingdienst", kort: "Belastingdienst" },
  toeslagen: { naam: "Dienst Toeslagen", kort: "Toeslagen" },
  svb: { naam: "Sociale Verzekeringsbank", kort: "SVB" },
  cak: { naam: "CAK", kort: "CAK" },
  uwv: { naam: "UWV", kort: "UWV" },
  rdw: { naam: "RDW", kort: "RDW" },
  waterschap: { naam: "Waterschap", kort: "Waterschap" },
  cjib: { naam: "CJIB", kort: "CJIB" },
  duo: { naam: "DUO", kort: "DUO" },
  rvo: { naam: "RVO", kort: "RVO" },
  kvk: { naam: "KVK", kort: "KVK" },
};

// Labels voor de brief-types uit de correspondentiestroom.
const briefTypeLabels = {
  informatiebrief: "Informatiebrief",
  actiebrief: "Actiebrief",
  factuur: "Factuur",
  aanmaning: "Aanmaning",
};

// De correspondentiestroom (demo-seed) staat als gedeeld bestand in data/taken-seed.mjs,
// zodat de app en de server (backend/server.mjs) dezelfde bron gebruiken.
const planTasks = takenSeed;


// API-modus (opt-in). Standaard draait MijnPlannen op de statische `planTasks`.
// Geef een MijnTaken-server mee via ?api=<url> in de URL om live te koppelen;
// de waarde wordt onthouden in localStorage zodat hash-navigatie blijft werken.
// Leeg maken kan met ?api= (lege waarde).
let planApiTasks = [];
let planFetchState = "idle"; // idle | loading | loaded | error

// Basis-URL voor de MijnTaken-API. Drie bronnen, in volgorde van voorrang:
//  1. window.MIJNPLANNEN_API — geïnjecteerd als de combined server de app
//     serveert. Waarde "" betekent same-origin (relatieve fetch, geen CORS).
//  2. ?api=<url> in de URL — onthouden in localStorage. Leeg = wissen.
//  3. anders: statische demo-data.
function planApiBase() {
  if (typeof window.MIJNPLANNEN_API === "string") return window.MIJNPLANNEN_API;
  const fromQuery = new URLSearchParams(location.search).get("api");
  if (fromQuery !== null) {
    if (fromQuery) localStorage.setItem("mijnplannen-api", fromQuery.replace(/\/+$/, ""));
    else localStorage.removeItem("mijnplannen-api");
  }
  return localStorage.getItem("mijnplannen-api") ?? "";
}

// API-modus aan? (same-origin base "" telt ook als aan.)
function planApiEnabled() {
  return typeof window.MIJNPLANNEN_API === "string" || !!planApiBase();
}

// De actieve takenbron: live API-resultaat of de statische lijst.
function planSource() {
  return planApiEnabled() ? planApiTasks : planTasks;
}

async function fetchPlanTasks() {
  if (!planApiEnabled()) return;
  const base = planApiBase();
  planFetchState = "loading";
  try {
    const res = await fetch(`${base}/context/zoek`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ klantId: "demo", include: ["taken"] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    planApiTasks = Array.isArray(data.taken) ? data.taken : [];
    planFetchState = "loaded";
  } catch (err) {
    planFetchState = "error";
    console.error("MijnPlannen: kon taken niet laden van API", err);
  }
  if (["plannen", "taken", "overzicht", "berichten"].includes(normalizeRoute().section)) render();
}

const labels = {
  overzicht: "Home",
  taken: "Mijn taken",
  berichten: "Mijn berichten",
  zaken: "Mijn zaken",
  producten: "Mijn producten",
  belastingzaken: "Belastingzaken",
  woz: "WOZ",
  parkeren: "Parkeren",
  erfpacht: "Erfpacht",
  vakantieverhuur: "Vakantieverhuur",
  gegevens: "Mijn gegevens",
  agenda: "Mijn agenda",
  plan: "Mijn plan",
  plannen: "Nabestaandendossier",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeRoute() {
  const route = location.hash.replace(/^#\/?/, "") || "overzicht";
  const [section, detail, subdetail] = route.split("/");
  return { section, detail, subdetail };
}

function setActive(section) {
  navButtons.forEach((button) =>
    button.classList.toggle("active", button.dataset.route === section),
  );
  // Home is de parent van alle menu-pagina's (consistent met de menubalk).
  setBreadcrumb(
    section === "overzicht"
      ? [{ label: "Home" }]
      : [{ label: "Home", href: "#overzicht" }, { label: labels[section] ?? "Home" }],
  );
  document.title = `${labels[section] ?? "MijnOverheid"} - MijnOverheid`;
}

function setBreadcrumb(items) {
  breadcrumbs.innerHTML = items
    .map((item, index) => {
      const content = item.href
        ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
        : `<span>${escapeHtml(item.label)}</span>`;
      return `${index > 0 ? '<span aria-hidden="true">›</span>' : ""}${content}`;
    })
    .join("");
}

function render() {
  const { section, detail, subdetail } = normalizeRoute();
  const route = labels[section] ? section : "zaken";
  setActive(route);

  if (route === "zaken" && detail === "informatie") {
    renderInformationForm();
  } else if (route === "zaken" && subdetail === "documenten") {
    renderCaseDocuments(Number(detail));
  } else if (route === "zaken" && detail) {
    renderCaseDetail(Number(detail));
  } else if (route === "zaken") {
    renderCases();
  } else if (route === "overzicht") {
    renderOverview();
  } else if (route === "taken") {
    renderTasks();
  } else if (route === "berichten" && detail) {
    renderMessageDetail(Number(detail));
  } else if (route === "berichten") {
    renderMessages();
  } else if (route === "producten") {
    renderProducts();
  } else if (route === "gegevens") {
    renderProfile();
  } else if (route === "belastingzaken") {
    renderTaxPage();
  } else if (route === "erfpacht" && detail === "facturen") {
    renderErfpachtInvoicesPage();
  } else if (route === "erfpacht" && detail === "contract") {
    renderErfpachtContractPage();
  } else if (route === "vakantieverhuur" && detail === "vergunning") {
    renderVacationPermitPage();
  } else if (route === "agenda") {
    renderAgenda();
  } else if (route === "plan") {
    renderPlan();
  } else if (route === "plannen" && detail) {
    renderPlanDetail(detail);
  } else if (route === "plannen") {
    renderPlannen();
  } else {
    renderTheme(route);
  }

  app.focus({ preventScroll: true });
  updateBerichtenBadge();
}

// Zet de badge bij "Mijn berichten" op het aantal brieven dat nog actie vraagt.
function updateBerichtenBadge() {
  const badge = document.querySelector('.side-nav button[data-route="berichten"] .badge');
  if (!badge) return;
  const n = planSource().filter((t) => planActionable(t) && t.status !== "afgerond").length;
  badge.textContent = String(n);
  badge.hidden = n === 0;
}

function renderOverview() {
  ensurePlanLoaded();
  const openActions = planOpenActions();
  const takenHtml = openActions.length
    ? `<div class="plan-task-list">${openActions.slice(0, 4).map((t) => planTaskRow(t, true)).join("")}</div>`
    : `<p class="empty-line">U heeft op dit moment geen openstaande taken.</p>`;
  app.innerHTML = `
    <article class="dashboard-page">
      <header class="dashboard-intro">
        <h1>Hallo Jeroen van Drouwen</h1>
        <p>In ‘Mijn omgeving’ kunt u zelf uw persoonlijke zaken regelen wanneer het u uitkomt. U kunt bijvoorbeeld uw rekeningen betalen en zien wanneer uw aanvraag klaar is.</p>
      </header>

      <a class="dossier-highlight" href="#plannen">
        <span class="dossier-highlight-icon" aria-hidden="true"><svg class="icon"><use href="#icon-clipboard"></use></svg></span>
        <span class="dossier-highlight-body">
          <strong>Nabestaandendossier</strong>
          <span>Na het overlijden van uw partner Cees moet er veel geregeld worden. Bekijk gebundeld wat er al automatisch is geregeld en wat nog uw aandacht vraagt.</span>
        </span>
        <span class="dossier-highlight-cta">${openActions.length} ${openActions.length === 1 ? "taak" : "taken"} openstaand <span aria-hidden="true">→</span></span>
      </a>

      <section class="dashboard-section">
        <h1>Mijn taken</h1>
        <a class="all-link" href="#taken">Bekijk alle taken (${openActions.length}) <span aria-hidden="true">→</span></a>
        ${takenHtml}
      </section>

      <section class="dashboard-section">
        <h1>Mijn lopende zaken</h1>
        <a class="all-link" href="#zaken">Bekijk alle zaken (10) <span aria-hidden="true">→</span></a>
        <div class="folder-card-grid">
          ${folderCard("zaken/0", "Aanvraag subsidie geluidsisolatie", "17 oktober 2022")}
          ${folderCard("zaken/1", "WMO-melding", "29 september 2024")}
          ${folderCard("zaken/2", "Opzeggen parkeervergunning", "5 december 2023")}
          ${folderCard("zaken/3", "Aanvraag afkoop canon Keukenlaan 133", "5 december 2023")}
        </div>
      </section>

      <section class="dashboard-section">
        <h1>Wat heb ik gekregen?</h1>
        <a class="all-link" href="#producten">Bekijk alle producten (4) <span aria-hidden="true">→</span></a>
        <div class="product-card-grid">
          ${productDashboardCard("Erfpachtcontract", "Keukenhoflaan 133", "1 december 2023", "1 taak open", "erfpacht/contract")}
          ${productDashboardCard("Verhuurontheffing", "Dierenselaan 88", "17 oktober 2021", "", "vakantieverhuur/vergunning")}
          ${productDashboardCard("Parkeervergunning bewoners", "34-FJT-23", "16 januari 2024")}
          ${productDashboardCard("Parkeerbon", "34-FJT-23", "30 januari 2025")}
        </div>
      </section>

      <section class="dashboard-section">
        <h1>Thema’s</h1>
        <div class="theme-shortcuts">
          ${overviewCard("belastingzaken", "Belastingzaken", "3 taken", "Bekijk aanslagen, betaalregelingen en bezwaarzaken.")}
          ${overviewCard("woz", "WOZ", "1 zaak", "Bekijk WOZ-objecten en taxatieverslagen.")}
          ${overviewCard("parkeren", "Parkeren", "3 zaken", "Regel vergunningen, bonnen en kentekens.")}
          ${overviewCard("erfpacht", "Erfpacht", "1 taak open", "Bekijk contracten, facturen en afkoopaanvragen.")}
          ${overviewCard("vakantieverhuur", "Vakantieverhuur", "1 melding", "Bekijk meldingen en voorwaarden.")}
          ${overviewCard("plan", "Mijn plan", "Concept", "Volg doelen, afspraken, documenten en contactpersonen.")}
        </div>
      </section>
    </article>
  `;
}

function overviewCard(route, title, meta, text) {
  return `
    <a class="overview-card" href="#${route}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(meta)}</span>
      <p>${escapeHtml(text)}</p>
    </a>
  `;
}

function taskListHtml() {
  return `
    <div class="task-list dashboard-task-list">
      ${tasks
        .map(
          ([title, due, urgent]) => `
            <a class="task-list-row" href="#taken">
              <strong>${escapeHtml(title)}</strong>
              ${due ? `<span class="${urgent ? "urgent-badge" : "task-due"}">${escapeHtml(due)}</span>` : "<span></span>"}
              <span class="arrow" aria-hidden="true">→</span>
            </a>
          `,
        )
        .join("")}
    </div>
  `;
}

function folderCard(route, title, date) {
  return `
    <a class="folder-card" href="#${route}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(date)}</span>
      <span class="arrow" aria-hidden="true">→</span>
    </a>
  `;
}

function productDashboardCard(title, subtitle, date, badge = "", route = "producten") {
  return `
    <a class="dashboard-product-card" href="#${escapeHtml(route)}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(subtitle)}</span>
      <small>${escapeHtml(date)}</small>
      ${badge ? `<em>${escapeHtml(badge)}</em>` : ""}
      <span class="arrow" aria-hidden="true">→</span>
    </a>
  `;
}

function renderCases(query = "") {
  const filtered = filterRows(cases, query);
  const visibleRows = query ? filtered : filtered.slice(0, 10);
  app.innerHTML = `
    <h1>Mijn zaken</h1>
    ${searchControls("Zoeken...", query)}
    <p class="count">${filtered.length === cases.length ? "89" : filtered.length} zaken</p>
    <div class="content-panel"><table class="data-table">
      <thead>
        <tr>
          <th>Naam</th>
          <th>Datum aanvraag</th>
          <th>Open of gesloten</th>
        </tr>
      </thead>
      <tbody>
        ${visibleRows
          .map((row) => {
            const originalIndex = cases.indexOf(row);
            return `
              <tr>
                <td data-label="Naam"><a class="table-link" href="#zaken/${originalIndex}">${escapeHtml(row[0])}</a></td>
                <td data-label="Datum aanvraag">${escapeHtml(row[1])}</td>
                <td data-label="Status"><span class="status">${escapeHtml(row[2])}</span></td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
    ${!query ? paginationHtml("zaken") : ""}
  `;
  bindSearch();
}

function paginationHtml(baseRoute) {
  return `
    <nav class="pagination" aria-label="Paginering">
      <span>Pagina 1 van 9</span>
      <a aria-current="page" href="#${baseRoute}">1</a>
      <a href="#${baseRoute}">2</a>
      <a href="#${baseRoute}">3</a>
      <span aria-hidden="true">…</span>
      <a href="#${baseRoute}">9</a>
      <a href="#${baseRoute}">Volgende <span aria-hidden="true">→</span></a>
    </nav>
  `;
}

function searchControls(placeholder, value = "") {
  return `
    <form class="search-row" data-search-form>
      <label class="sr-only" for="page-search">Zoeken</label>
      <input id="page-search" name="q" autocomplete="off" placeholder="${placeholder}" value="${escapeHtml(value)}" />
      <button class="secondary-button" type="submit">Zoeken</button>
      <button class="secondary-button filter-button" type="button"><svg class="icon" aria-hidden="true"><use href="#icon-filter"></use></svg>Filter</button>
    </form>
  `;
}

function filterRows(rows, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => row.join(" ").toLowerCase().includes(needle));
}

function bindSearch() {
  const form = app.querySelector("[data-search-form]");
  const input = form?.querySelector("input");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    renderCases(input.value);
  });
  form?.querySelector(".filter-button")?.addEventListener("click", openFilter);
}

function renderCaseDetail(index) {
  const item = cases[index] ?? cases[0];
  app.innerHTML = `
    <article class="case-page">
      <a class="back-link" href="#zaken"><span aria-hidden="true">←</span> Terug</a>
      <h1>${escapeHtml(item[0])}</h1>

      <section class="case-action">
        <strong>Geef informatie voor uw aanvraag subsidie geluidsisolatie</strong>
        <span class="case-warning" aria-label="Urgent">△</span>
        <span class="case-warning-text">nog 2 dagen</span>
        <a class="primary-button" href="#zaken/informatie">Informatie geven</a>
      </section>

      <section class="case-section">
        <h1>Status</h1>
        <ol class="case-status">
          <li class="is-done">
            <span class="status-marker">✓</span>
            <div>
              <button type="button">Deelname aan geluidsonderzoek <span aria-hidden="true">⌄</span></button>
            </div>
          </li>
          <li class="is-current">
            <span class="status-marker">2</span>
            <div>
              <button type="button">Onderzoek naar geluidsoverlast <span aria-hidden="true">⌃</span></button>
              <p class="status-substep">Afspraak gemaakt voor het kijken welke verbeteringen nodig zijn aan de woning<br />De afspraak is op woensdag 5 januari 2023</p>
              <p class="status-substep">Adviseur is bij de woning geweest</p>
            </div>
          </li>
          <li>
            <span class="status-marker">3</span>
            <div><strong>Uitvoeren van woningverbetering</strong></div>
          </li>
          <li>
            <span class="status-marker">4</span>
            <div><strong>Woning verbeteringen uitgevoerd</strong></div>
          </li>
        </ol>
      </section>

      <section class="case-section">
        <h1>Details</h1>
        <dl class="case-detail-list">
          <dt>Datum aanvraag</dt><dd>17 oktober 2022</dd>
          <dt>Zaaknummer</dt><dd>11234899818</dd>
        </dl>
      </section>

      <section class="case-section">
        <h1>Documenten</h1>
        <a class="all-link" href="#zaken/${index}/documenten">Bekijk alle documenten (${documents.length}) <span aria-hidden="true">→</span></a>
        <a class="document-row" href="#zaken/${index}">
          <span class="document-icon" aria-hidden="true">▤</span>
          <span>example3 (png, 2000 kB, 31-8-2024)</span>
          <span class="download-link">⇩ Download</span>
        </a>
      </section>

      <section class="case-section">
        <h1>Eerdere contactmomenten</h1>
        <ol class="contact-timeline">
          ${[
            [
              "1-12-2022",
              "mail",
              "Er is naar u een herinnering verstuurd over het geven van informatie",
            ],
            ["1-12-2022", "mail", "Er is van u gevraagd om informatie te geven"],
            ["1-12-2022", "main", "Er is naar u een tip verstuurd over recht op extra subsidie"],
            ["1-12-2022", "mail", "Status is veranderd naar ‘Onderzoek naar geluidsoverlast’"],
            ["1-12-2022", "vraag", "U heeft een vraag gesteld aan de gemeente"],
            ["1-12-2022", "telefoon", "Gesprek gehad over afspraak met adviseur"],
            ["1-12-2022", "brief", "Er is naar u een brief verstuurd over kosten onderzoek en"],
            ["1-12-2022", "mail", "Status is veranderd naar ‘Deelname aan gebruikersonderzoek’"],
            ["1-12-2022", "balie", "Bezoek gehad voor het inscannen van documenten"],
            [
              "1-12-2022",
              "brief",
              "Er is naar u een brief verstuurd over actie woningverbetering verkeersgeluid bewoner",
            ],
          ]
            .map(
              ([date, channel, text]) => `
                <li>
                  <time>${date}</time>
                  <span class="contact-dot" aria-hidden="true"></span>
                  <span>${channel}</span>
                  <strong>${text}</strong>
                </li>
              `,
            )
            .join("")}
        </ol>
      </section>

      <section class="case-action case-action-bottom">
        <strong>Geef informatie voor uw aanvraag subsidie geluidsisolatie</strong>
        <span class="case-warning" aria-label="Urgent">△</span>
        <span class="case-warning-text">29-09-2023</span>
        <a class="primary-button" href="#zaken/informatie">Informatie geven</a>
      </section>
    </article>
  `;
}

function renderCaseDocuments(index) {
  const item = cases[index] ?? cases[0];
  app.innerHTML = `
    <article class="case-page">
      <a class="back-link" href="#zaken/${index}"><span aria-hidden="true">←</span> Terug</a>
      <h1>Documenten</h1>
      <p class="page-subtitle">${escapeHtml(item[0])}</p>
      <p class="count">${documents.length} documenten</p>
      <div class="document-list">
        ${documents
          .map(
            ([name, type, size, date, source]) => `
              <a class="document-row document-row-rich" href="#zaken/${index}/documenten">
                <span class="document-icon" aria-hidden="true">▤</span>
                <span>
                  <strong>${escapeHtml(name)}</strong>
                  <small>${escapeHtml(type)}, ${escapeHtml(size)}, ${escapeHtml(date)}</small>
                </span>
                <em>${escapeHtml(source)}</em>
                <span class="download-link">⇩ Download</span>
              </a>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderInformationForm() {
  app.innerHTML = `
    <article class="form-page">
      <a class="back-link" href="#zaken/0"><span aria-hidden="true">←</span> Terug</a>
      <h1>Informatie doorgeven</h1>

      <form class="info-form">
        <p class="step-indicator">Stap 1 van 3</p>
        <h1>Reden</h1>

        <label for="reason">Reden van aanvraag</label>
        <textarea id="reason" name="reason" rows="6"></textarea>

        <fieldset class="upload-fieldset">
          <legend>Foto van muren</legend>
          <ul>
            <li>De maximale bestandsgrootte is 10 MB.</li>
            <li>Toegestane bestandstypen: doc, docx, xslx, pdf, zip, jpg, png, bmp en gif.</li>
          </ul>
          <label class="upload-dropzone">
            <input type="file" name="wall-photo" />
            <span>Sleep uw bestand hier of</span>
            <strong>Bestand kiezen</strong>
          </label>
        </fieldset>

        <button class="primary-button next-step" type="button">Volgende stap <span aria-hidden="true">→</span></button>

        <nav class="form-secondary-actions" aria-label="Formulier acties">
          <a href="#zaken/0"><span aria-hidden="true">›</span> Opslaan en later verder gaan</a>
          <a href="#zaken/0"><span aria-hidden="true">›</span> Stoppen met formulier</a>
        </nav>
      </form>
    </article>
  `;
}

function renderTasks() {
  ensurePlanLoaded();
  const open = planOpenActions();
  const loading = planApiEnabled() && planFetchState === "loading" && !open.length;
  app.innerHTML = `
    <h1>Mijn taken</h1>
    <p class="page-subtitle">Alles wat er na het overlijden van uw partner Cees nog uw aandacht vraagt, uit uw nabestaandedossier.</p>
    ${
      loading
        ? `<p class="empty-line">Taken laden…</p>`
        : open.length
          ? `<div class="content-panel"><div class="plan-task-list">${open.map((t) => planTaskRow(t, true)).join("")}</div></div>`
          : `<p class="empty-line">U heeft op dit moment geen openstaande taken.</p>`
    }
  `;
}

function renderMessages() {
  ensurePlanLoaded();
  // De brieven uit het Nabestaandendossier zijn de berichten. Nieuwste eerst;
  // brieven die nog actie vragen tonen we als "ongelezen". Klik = briefdetail.
  const briefs = [...planSource()].sort((a, b) => (b.ontvangen ?? "").localeCompare(a.ontvangen ?? ""));
  const loading = planApiEnabled() && planFetchState === "loading" && !briefs.length;
  app.innerHTML = `
    <h1>Mijn berichten</h1>
    <p class="page-subtitle">Post van de overheid na het overlijden van uw partner Cees, gebundeld vanuit uw Nabestaandendossier.</p>
    ${
      loading
        ? `<p class="empty-line">Berichten laden…</p>`
        : !briefs.length
          ? `<p class="empty-line">U heeft geen berichten.</p>`
          : `<div class="content-panel"><table class="message-table">
      <thead>
        <tr>
          <th>Onderwerp</th>
          <th>Ontvangen</th>
        </tr>
      </thead>
      <tbody>
        ${briefs
          .map((b) => {
            const unread = planActionable(b) && b.status !== "afgerond";
            return `
              <tr class="${unread ? "is-unread" : ""}" data-msg-href="#plannen/${encodeURIComponent(b.uuid)}">
                <td data-label="Onderwerp">
                  <small class="message-afzender">${escapeHtml(orgNaam(b.organisatie ?? "overig"))}</small>
                  <a class="message-link" href="#plannen/${encodeURIComponent(b.uuid)}">
                    ${unread ? '<span class="unread-dot" aria-label="Vraagt om actie"></span>' : ""}
                    <span>${escapeHtml(b.titel?.nl ?? "")}</span>
                  </a>
                </td>
                <td data-label="Ontvangen">${escapeHtml(planFormatDate(b.ontvangen))}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table></div>`
    }
  `;
  // Hele rij klikbaar (de titel blijft een echte link voor toetsenbordgebruik).
  app.querySelectorAll("tr[data-msg-href]").forEach((tr) => {
    tr.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      location.hash = tr.dataset.msgHref;
    });
  });
}

function renderMessageDetail(index) {
  const [title, date, , received] = messages[index] ?? messages[0];
  const isPayment = title.toLowerCase().includes("parkeerbon");
  app.innerHTML = `
    <article class="message-detail-page">
      <a class="back-link" href="#berichten"><span aria-hidden="true">←</span> Terug</a>
      <h1>${escapeHtml(title)}</h1>
      <p class="page-subtitle">${escapeHtml(received)}</p>

      ${isPayment ? `<a class="primary-button message-action" href="#parkeren">Betalen</a>` : ""}

      <section class="case-section">
        <h1>Details</h1>
        <dl class="case-detail-list">
          <dt>Reden</dt><dd>${isPayment ? "Parkeerbon" : "Aanvullende informatie nodig"}</dd>
          <dt>Datum bericht</dt><dd>${escapeHtml(date)}</dd>
          <dt>Zaak</dt><dd><a href="#zaken/0">Aanvraag subsidie geluidsisolatie</a></dd>
          ${isPayment ? "<dt>Kenteken</dt><dd>34-FJT-23</dd><dt>Totaalbedrag</dt><dd>€ 74,90</dd>" : ""}
        </dl>
      </section>

      <section class="case-section">
        <h1>Bericht</h1>
        <div class="message-body">
          <p>Wij vragen u om deze informatie te bekijken en waar nodig actie te ondernemen in uw persoonlijke omgeving.</p>
          <p>Gebruik voor uw veiligheid altijd de Mijn omgeving zelf. Notificaties per e-mail bevatten daarom geen directe betaallinks.</p>
        </div>
      </section>

      <section class="case-section">
        <h1>Documenten</h1>
        <a class="document-row" href="#berichten/${index}">
          <span class="document-icon" aria-hidden="true">▤</span>
          <span>bericht-bijlage.pdf (pdf, 168 kB, ${escapeHtml(date)})</span>
          <span class="download-link">⇩ Download</span>
        </a>
      </section>

      ${isPayment ? `<a class="primary-button message-action message-action-bottom" href="#parkeren">Betalen</a>` : ""}
    </article>
  `;
}

function renderProducts() {
  app.innerHTML = `
    <h1>Mijn producten</h1>
    <div class="card-list">
      ${products
        .map(
          ([title, text, group, route]) => `
            <a class="product-card" href="${escapeHtml(route)}">
              <span>
                <h3>${escapeHtml(title)}</h3>
                <span class="muted">${escapeHtml(text)}</span>
              </span>
              <strong>${escapeHtml(group)}</strong>
            </a>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderTaxPage() {
  app.innerHTML = `
    <section class="stacked-page tax-page">
      <header class="tax-page-header">
        <h1>Belastingzaken</h1>
      </header>

      <section>
        <h2>Mijn taken</h2>
        <div class="arrow-list">
          ${taxTasks
            .map(
              ([title, due]) => `
                <a class="arrow-list-row task-row" href="#taken">
                  <strong>${escapeHtml(title)}</strong>
                  <span>${escapeHtml(due)}</span>
                  <span class="arrow" aria-hidden="true">→</span>
                </a>
              `,
            )
            .join("")}
        </div>
      </section>

      <section>
        <h2>Wat kan ik regelen</h2>
        <div class="arrow-list">
          ${taxActions
            .map(
              (title) => `
                <a class="arrow-list-row action-row" href="#belastingzaken">
                  <strong>${escapeHtml(title)}</strong>
                  <span class="arrow" aria-hidden="true">→</span>
                </a>
              `,
            )
            .join("")}
        </div>
      </section>

      <section>
        <h2>Mijn zaken</h2>
        <a class="tax-case-card" href="#zaken/5">
          <strong>Bezwaar tegen afvalstoffenheffing 2024</strong>
          <span>5 januari 2024</span>
          <span class="arrow" aria-hidden="true">→</span>
        </a>
      </section>

      <section>
        <h2>Aanslagen</h2>
        <a class="all-link" href="#belastingzaken">Bekijk alle aanslagen (8) <span aria-hidden="true">→</span></a>
        <table class="assessment-table">
          <thead>
            <tr>
              <th>Belastingjaar</th>
              <th>Aanslagnummer</th>
              <th>Omschrijving</th>
              <th>Bedrag</th>
              <th>Nog te betalen</th>
            </tr>
          </thead>
          <tbody>
            ${taxAssessments
              .map(
                (row) => `
                  <tr>
                    <td data-label="Belastingjaar">${escapeHtml(row[0])}</td>
                    <td data-label="Aanslagnummer">${escapeHtml(row[1])}</td>
                    <td data-label="Omschrijving">${escapeHtml(row[2])}</td>
                    <td data-label="Bedrag">${escapeHtml(row[3])}</td>
                    <td data-label="Nog te betalen">${escapeHtml(row[4])}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>
    </section>
  `;
}

function renderVacationPermitPage() {
  setBreadcrumb([
    { label: "Home", href: "#overzicht" },
    { label: "Vakantieverhuur", href: "#vakantieverhuur" },
    { label: "Aanvraag vakantieverhuur Dierenselaan 88" },
  ]);
  app.innerHTML = `
    <article class="product-detail-page">
      <a class="back-link" href="#vakantieverhuur"><span aria-hidden="true">←</span> Terug</a>
      <h1>Vergunning vakantieverhuur<br />Dierenselaan 88</h1>

      <section class="product-detail-section">
        <h1>Wat kan ik regelen</h1>
        <div class="arrow-list">
          <a class="arrow-list-row action-row" href="#vakantieverhuur/vergunning">
            <strong>Verblijf melden op deze locatie</strong>
            <span class="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <section class="product-detail-section">
        <h1>Gemelde huur</h1>
        <h2>Aankomend</h2>
        ${vacationRentalTable([["2", "3-11-2025", "15-11-2025", "12", "Aanpassen"]])}

        <h2>Geschiedenis</h2>
        ${vacationRentalTable([
          ["5", "17-3-2024", "29-3-2024", "12", ""],
          ["8", "11-2-2024", "16-2-2024", "5", ""],
          ["1", "1-1-2024", "12-1-2024", "2", ""],
        ])}
      </section>

      <section class="product-detail-section">
        <h1>Aanslag</h1>
        <dl class="case-detail-list">
          <dt>Registratienummer</dt><dd>8rw44r7847890</dd>
          <dt>Ingangsdatum</dt><dd>1 januari 2025</dd>
          <dt>Einddatum</dt><dd>31 december 2025</dd>
          <dt>Nachten beschikbaar</dt><dd>13</dd>
        </dl>
      </section>
    </article>
  `;
}

function vacationRentalTable(rows) {
  return `
    <table class="assessment-table rental-table">
      <thead>
        <tr>
          <th>Aantal gasten</th>
          <th>Incheckdatum</th>
          <th>Uitcheckdatum</th>
          <th>Aantal dagen</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            ([guests, checkIn, checkOut, days, action]) => `
              <tr>
                <td data-label="Aantal gasten">${escapeHtml(guests)}</td>
                <td data-label="Incheckdatum">${escapeHtml(checkIn)}</td>
                <td data-label="Uitcheckdatum">${escapeHtml(checkOut)}</td>
                <td data-label="Aantal dagen">${escapeHtml(days)}</td>
                <td data-label="Actie">${action ? `<a href="#vakantieverhuur/vergunning">${escapeHtml(action)}</a>` : ""}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderErfpachtContractPage() {
  setBreadcrumb([
    { label: "Home", href: "#overzicht" },
    { label: "Erfpacht", href: "#erfpacht" },
    { label: "Keukenhoflaan 133 en 3 meer" },
  ]);
  app.innerHTML = `
    <article class="product-detail-page">
      <a class="back-link" href="#erfpacht"><span aria-hidden="true">←</span> Terug</a>
      <h1>Keukenhoflaan 133 en 3 meer</h1>

      ${paymentNotice()}

      <section class="product-detail-section">
        <h1>Wat kan ik regelen?</h1>
        <div class="arrow-list">
          ${[
            "Vraag heruitgifte erfpacht aan",
            "Vraag omzetting erfpacht aan",
            "Vraag afkoop canonverplichting aan",
            "Koop erfpachtgrond",
          ]
            .map(
              (title) => `
                <a class="arrow-list-row action-row" href="#erfpacht/contract">
                  <strong>${escapeHtml(title)}</strong>
                  <span class="arrow" aria-hidden="true">→</span>
                </a>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="product-detail-section">
        <h1>Mijn zaken</h1>
        ${folderCard("zaken/3", "Aanvraag afkoop canon Keukenhoflaan 133", "5 januari 2024")}
      </section>

      <section class="product-detail-section">
        <h1>Factuur</h1>
        <a class="document-row" href="#erfpacht/contract">
          <span class="document-icon" aria-hidden="true">▤</span>
          <span>example3 (png, 2000 kB, 31-8-2024)</span>
          <span class="download-link">⇩ Download</span>
        </a>
        <a class="all-link paid-invoices-link" href="#erfpacht/facturen">Bekijk betaalde facturen <span aria-hidden="true">→</span></a>
      </section>

      <section class="product-detail-section">
        <h1>Gegevens contactpersoon</h1>
        ${definitionList([
          ["Naam", "B. Smilde"],
          ["Adres", "Keukenhoflaan 133, 2548 PD voorbeeld"],
          ["Klantnummer", "1056034"],
          ["E-mailadres", "b.smilde@gmail.com"],
        ])}
      </section>

      <section class="product-detail-section">
        <h1>Contractgegevens</h1>
        ${definitionList([
          ["Contracttype", "vw 86 heruitgifte obl afkoop"],
          ["Contractnummer", "4992"],
          ["Einddatum contract", ""],
        ])}
      </section>

      <section class="product-detail-section">
        <h1>Kadastrale gegevens</h1>
        ${definitionList(
          [
            [
              "Kadastraal object",
              "GVH37 AW 01639 0036<br />GVH37 AW 01639 2381<br />GVH37 AW 73462 72361<br />GVH40 AW 01639 2381",
            ],
            [
              "Contractnummer",
              "Keukenhoflaan 133 Voorbeeld<br />Keukenhoflaan 133A Voorbeeld<br />Keukenhoflaan 133B Voorbeeld<br />Keukenhoflaan 133C Voorbeeld",
            ],
          ],
          true,
        )}
      </section>

      <section class="product-detail-section">
        <h1>Financiële gegevens</h1>
        ${definitionList([
          ["Grondwaarde", "€ 25.850,00"],
          ["Canonpercentage", "1,5%"],
        ])}
        <table class="assessment-table finance-table">
          <thead>
            <tr>
              <th>Soort financiën</th>
              <th>Bedrag</th>
              <th>Periode</th>
              <th>Factuurwijze</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Soort financiën">Canon oude rechten</td>
              <td data-label="Bedrag">€ 6,32</td>
              <td data-label="Periode">Halfjaarlijks</td>
              <td data-label="Factuurwijze">Achteraf</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="product-detail-section">
        <h1>Canonherziening</h1>
        ${definitionList([
          ["Geplande canonherziening", "01-07-2024"],
          ["Soort herziening", "Vijfjaarlijkse herziening rentepercentage"],
        ])}
      </section>

      ${paymentNotice("product-detail-bottom-notice")}
    </article>
  `;
}

function definitionList(rows, allowHtml = false) {
  return `
    <dl class="case-detail-list product-definition-list">
      ${rows
        .map(([key, value]) => {
          const safeValue = allowHtml ? value : escapeHtml(value);
          return `<dt>${escapeHtml(key)}</dt><dd>${safeValue}</dd>`;
        })
        .join("")}
    </dl>
  `;
}

function paymentNotice(extraClass = "") {
  return `
    <section class="case-action product-payment-notice ${extraClass}">
      <strong>Uw erfpachtfactuur van € 27,52 voor de periode juli tot en met december 2023</strong>
      <span class="case-warning" aria-label="Urgent">△</span>
      <span class="case-warning-text">01-03-2024</span>
      <a class="primary-button" href="#erfpacht/contract">Betalen</a>
    </section>
  `;
}

function renderErfpachtInvoicesPage() {
  setBreadcrumb([
    { label: "Home", href: "#overzicht" },
    { label: "Erfpacht", href: "#erfpacht" },
    { label: "Facturen" },
  ]);
  app.innerHTML = `
    <article class="product-detail-page invoice-page">
      <a class="back-link" href="#erfpacht/contract"><span aria-hidden="true">←</span> Terug</a>
      <h1>Facturen</h1>

      <form class="search-row invoice-search" data-invoice-search>
        <label class="sr-only" for="invoice-search">Zoeken in facturen</label>
        <input id="invoice-search" name="q" autocomplete="off" placeholder="Zoeken..." />
        <button class="secondary-button" type="submit">Zoeken</button>
        <button class="secondary-button filter-button" type="button"><svg class="icon" aria-hidden="true"><use href="#icon-filter"></use></svg>Filter</button>
      </form>

      <p class="count">12 facturen</p>

      <table class="assessment-table invoice-table">
        <thead>
          <tr>
            <th>Periode</th>
            <th>Totaal</th>
            <th>Openstaand</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${groundLeaseInvoices
            .map(
              ([period, total, open]) => `
                <tr>
                  <td data-label="Periode"><a href="#erfpacht/facturen">${escapeHtml(period)}</a></td>
                  <td data-label="Totaal">${escapeHtml(total)}</td>
                  <td data-label="Openstaand">${escapeHtml(open)}</td>
                  <td data-label="Download"><a href="#erfpacht/facturen">Download</a></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>

      <nav class="pagination invoice-pagination" aria-label="Paginering facturen">
        <span>Vorige</span>
        <a aria-current="page" href="#erfpacht/facturen">1</a>
        <a href="#erfpacht/facturen">2</a>
        <a href="#erfpacht/facturen">Volgende</a>
      </nav>
    </article>
  `;
  const form = app.querySelector("[data-invoice-search]");
  form?.addEventListener("submit", (event) => event.preventDefault());
}

function renderTheme(route) {
  const data = themeData[route];
  if (!data) {
    app.innerHTML = `<h1>${escapeHtml(labels[route] ?? "Pagina")}</h1><div class="empty-state"><h2>Geen actuele items</h2><p>Er staan op dit moment geen open zaken of producten in deze categorie.</p></div>`;
    return;
  }
  app.innerHTML = `
    <section class="stacked-page theme-page">
      <section>
        <h1>${escapeHtml(data.title)}</h1>
      </section>

      <section>
        <h1>Wat moet ik regelen</h1>
        ${
          data.tasks.length
            ? `<div class="arrow-list">${data.tasks
                .map(
                  ([title, due]) => `
                    <a class="arrow-list-row task-row" href="#taken">
                      <strong>${escapeHtml(title)}</strong>
                      <span>${escapeHtml(due)}</span>
                      <span class="arrow" aria-hidden="true">→</span>
                    </a>
                  `,
                )
                .join("")}</div>`
            : `<p class="empty-line">Er zijn geen openstaande taken.</p>`
        }
      </section>

      <section>
        <h1>Wat kan ik regelen</h1>
        <div class="arrow-list">
          ${data.actions
            .map(
              (title) => `
                <a class="arrow-list-row action-row" href="#${route}">
                  <strong>${escapeHtml(title)}</strong>
                  <span class="arrow" aria-hidden="true">→</span>
                </a>
              `,
            )
            .join("")}
        </div>
      </section>

      <section>
        <h1>Mijn zaken</h1>
        ${
          data.cases.length
            ? `<div class="folder-card-grid theme-card-grid">${data.cases
                .slice(0, 4)
                .map((caseIndex) => {
                  const target =
                    route === "vakantieverhuur" && caseIndex === 6
                      ? "vakantieverhuur/vergunning"
                      : route === "erfpacht" && caseIndex === 3
                        ? "erfpacht/contract"
                        : `zaken/${caseIndex}`;
                  return folderCard(target, cases[caseIndex][0], cases[caseIndex][1]);
                })
                .join("")}</div>`
            : `<p class="empty-line">U heeft geen openstaande zaken.</p>`
        }
      </section>

      <section>
        <h1>${escapeHtml(data.itemsTitle)}</h1>
        <table class="assessment-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Omschrijving</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.items
              .map(
                ([name, description, status]) => `
                  <tr>
                    <td data-label="Naam">${
                      route === "vakantieverhuur"
                        ? `<a href="#vakantieverhuur/vergunning">${escapeHtml(name)}</a>`
                        : route === "erfpacht"
                          ? `<a href="#erfpacht/contract">${escapeHtml(name)}</a>`
                          : escapeHtml(name)
                    }</td>
                    <td data-label="Omschrijving">${escapeHtml(description)}</td>
                    <td data-label="Status">${escapeHtml(status)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>
    </section>
  `;
}

function renderProfile() {
  app.innerHTML = `
    <article class="profile-page">
      <h1>Mijn gegevens</h1>
      <nav class="anchor-list" aria-label="Onderdelen op deze pagina">
        <a href="#gegevens">Contactgegevens</a>
        <a href="#gegevens">Persoonsgegevens</a>
        <a href="#gegevens">Adresgegevens</a>
        <a href="#gegevens">Meldingen</a>
      </nav>

      ${profileSection("Contactgegevens", [
        ["E-mailadres", "jeroen@example.test"],
        ["Telefoonnummer", "06 12345678"],
      ])}

      ${profileSection(
        "Persoonsgegevens",
        [
          ["Naam", "Jeroen van Drouwen"],
          ["Geboortedatum", "14 maart 1981"],
          ["Burgerservicenummer", "••••••782"],
        ],
        "Bekijk hoe de gemeente met persoonsgegevens omgaat",
      )}

      ${profileSection("Adresgegevens", [
        ["Woonadres", "Keukenlaan 133, 1234 AB Voorbeeld"],
        ["Postadres", "Gelijk aan woonadres"],
      ])}

      ${profileSection("Meldingen", [
        ["E-mail over nieuwe berichten", "Aan"],
        ["Sms over afspraken", "Uit"],
        ["Herinneringen voor taken", "Aan"],
      ])}
    </article>
  `;
}

function profileSection(title, rows, seeAlso = "") {
  return `
    <section class="profile-section">
      <div class="section-heading-row">
        <h2>${escapeHtml(title)}</h2>
        <a href="#gegevens">Wijzigen</a>
      </div>
      <dl class="definition-list">
        ${rows.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}
      </dl>
      ${seeAlso ? `<h3>Zie ook</h3><ul><li><a href="#privacy">${escapeHtml(seeAlso)}</a></li></ul>` : ""}
    </section>
  `;
}

function renderAgenda() {
  app.innerHTML = `
    <article class="stacked-page">
      <section>
        <h1>Mijn agenda</h1>
        <p class="page-subtitle">Afspraken met de gemeente op één plek.</p>
      </section>
      <section>
        <h1>Afspraken</h1>
        <div class="appointment-list">
          <article>
            <strong>Keukentafelgesprek Wmo-melding</strong>
            <span>Maandag 7 oktober 2024, 10.30 uur</span>
            <a href="#agenda">Wijzigen of annuleren <span aria-hidden="true">→</span></a>
          </article>
          <article>
            <strong>Balieafspraak identiteitskaart vernieuwen</strong>
            <span>Dinsdag 22 oktober 2024, 14.15 uur</span>
            <a href="#agenda">Zet in eigen agenda <span aria-hidden="true">→</span></a>
          </article>
        </div>
      </section>
    </article>
  `;
}

function renderPlan() {
  app.innerHTML = `
    <article class="stacked-page">
      <section>
        <h1>Mijn plan</h1>
        <p class="page-subtitle">Overzicht van doelen, taken, afspraken, contactpersonen en documenten.</p>
      </section>
      <section>
        <h1>Mijn doelen</h1>
        <div class="plan-grid">
          <article class="plan-card">
            <strong>Rust in administratie</strong>
            <span>2 open taken</span>
            <a href="#taken">Bekijk taken <span aria-hidden="true">→</span></a>
          </article>
          <article class="plan-card">
            <strong>Passende ondersteuning thuis</strong>
            <span>1 afspraak gepland</span>
            <a href="#agenda">Bekijk afspraken <span aria-hidden="true">→</span></a>
          </article>
        </div>
      </section>
      <section>
        <h1>Contactpersonen</h1>
        <dl class="case-detail-list">
          <dt>Consulent</dt><dd>R. de Vries</dd>
          <dt>Telefoon</dt><dd>14 000</dd>
        </dl>
      </section>
    </article>
  `;
}

function planFormatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

// Moet de nabestaande zelf iets doen?
function planActionable(task) {
  return task.actieNodig === true;
}

// Sorteer: open vóór afgerond, actie-nodig vóór passief, dan op deadline.
function planByUrgency(a, b) {
  const doneA = a.status === "afgerond" ? 1 : 0;
  const doneB = b.status === "afgerond" ? 1 : 0;
  if (doneA !== doneB) return doneA - doneB;
  const actA = planActionable(a) ? 0 : 1;
  const actB = planActionable(b) ? 0 : 1;
  if (actA !== actB) return actA - actB;
  return planDeadlineTs(a) - planDeadlineTs(b);
}

// Zorg dat de takendata geladen is (API-modus); re-rendert na binnenkomst.
function ensurePlanLoaded() {
  if (planApiEnabled() && planFetchState === "idle") fetchPlanTasks();
}

// Open acties (te doen), gesorteerd op urgentie — voor "Mijn taken" en de home.
function planOpenActions() {
  return planSource()
    .filter((t) => planActionable(t) && t.status !== "afgerond")
    .sort(planByUrgency);
}

// Badge rechts van de titel:
//  - actie met deadline → "Nog X dagen" (urgent) of "vóór <datum>"
//  - afgerond / automatisch geregeld → groene "✓"-badge
//  - ter info (geen actie, niet automatisch) → grijze "Ter info"-badge
//  - actie zonder deadline → niets (de sectie "Nog te doen" zegt het al)
function planRowBadge(task) {
  if (task.status === "afgerond") return `<span class="plan-status is-done">✓ Afgerond</span>`;
  if (planActionable(task)) {
    if (!task.deadline) return "<span></span>";
    const ts = planDeadlineTs(task);
    if (!Number.isFinite(ts)) return "<span></span>";
    const days = Math.ceil((ts - Date.now()) / (24 * 60 * 60 * 1000));
    if (days < 0) return `<span class="urgent-badge">Te laat</span>`;
    if (days <= 14) return `<span class="urgent-badge">Nog ${days} ${days === 1 ? "dag" : "dagen"}</span>`;
    return `<span class="task-due">vóór ${escapeHtml(planFormatDate(task.deadline))}</span>`;
  }
  if (task.automatisch) return `<span class="plan-status is-auto">✓ Geregeld</span>`;
  return `<span class="plan-status is-info">Ter info</span>`;
}

// Eén brief/taak als rij — exact het `task-list-row`-component van "Mijn taken"
// (titel · badge · pijl). `showOrg` toont de organisatie klein onder de titel
// (in de platte/urgentie-weergave, waar geen organisatie-kop is).
function planTaskRow(task, showOrg = false) {
  const isDone = task.status === "afgerond";
  const title = task.titel?.nl ?? "";
  const cls = `task-list-row${isDone ? " is-done" : ""}`;
  const orgMeta = showOrg ? `<small class="plan-row-org">${escapeHtml(orgNaam(task.organisatie ?? "overig"))}</small>` : "";
  const inner = `
    <strong><span class="task-title">${escapeHtml(title)}</span>${orgMeta}</strong>
    ${planRowBadge(task)}
    <span class="arrow" aria-hidden="true">→</span>
  `;
  // Klik opent de briefdetailpagina binnen de app (niet de externe site).
  return `<a class="${cls}" href="#plannen/${encodeURIComponent(task.uuid)}">${inner}</a>`;
}

function planFindTask(rawId) {
  const uuid = decodeURIComponent(rawId);
  return planSource().find((t) => t.uuid === uuid);
}

function formatAdres(a) {
  if (!a) return "";
  const regel = `${a.straat ?? ""} ${a.huisnummer ?? ""}`.trim();
  const plaats = `${a.postcode ?? ""} ${a.woonplaats ?? ""}`.trim();
  return [regel, plaats].filter(Boolean).join(", ");
}

// Detailpagina van één brief: afzender, aanhef, adressering, wat er gevraagd
// wordt + de handoff-knop. Toont ook de adresserings-pijnpunten uit de challenge.
function renderPlanDetail(rawId) {
  if (planApiEnabled() && planFetchState === "idle") fetchPlanTasks();
  const task = planFindTask(rawId);

  setBreadcrumb([
    { label: "Home", href: "#overzicht" },
    { label: "Nabestaandendossier", href: "#plannen" },
    { label: task?.titel?.nl ?? "Brief" },
  ]);

  if (!task) {
    const loading = planApiEnabled() && planFetchState === "loading";
    app.innerHTML = `
      <article class="case-page">
        <a class="back-link" href="#plannen"><span aria-hidden="true">←</span> Terug naar het dossier</a>
        ${loading ? `<p class="empty-line">Brief laden…</p>` : `<div class="empty-state"><h2>Brief niet gevonden</h2><p>Deze brief bestaat niet (meer).</p></div>`}
      </article>`;
    app.focus({ preventScroll: true });
    return;
  }

  const org = orgNaam(task.organisatie ?? "overig");
  const actionable = planActionable(task);
  const adres = formatAdres(task.adres);
  const deadline = task.deadline ? planFormatDate(task.deadline) : "";
  const url = task.uitvoering?.canonicalUrl ?? "";

  const flags = [];
  if (task.geadresseerde === "erven") flags.push("Deze brief is gericht aan ‘de erven’ in plaats van aan u persoonlijk.");
  if (task.adres?.verzorgingstehuis) flags.push("De brief is bezorgd op het adres van het verzorgingstehuis van de overledene.");

  const rows = [["Afzender", org]];
  if (task.briefType) rows.push(["Soort brief", briefTypeLabels[task.briefType] ?? task.briefType]);
  const ontvangen = planFormatDate(task.ontvangen);
  if (ontvangen) rows.push(["Ontvangen", ontvangen]);
  if (task.aanhef) rows.push(["Aanhef", task.aanhef]);
  if (task.geadresseerde) rows.push(["Gericht aan", task.geadresseerde === "erven" ? "De erven van de overledene" : "U (partner)"]);
  if (adres) rows.push(["Bezorgd op", adres + (task.adres?.verzorgingstehuis ? " — verzorgingstehuis" : "")]);
  if (actionable && deadline) rows.push(["Uiterlijk reageren", `vóór ${deadline}`]);
  if (task.leidtTotZaak) rows.push(["Leidt tot zaak", task.leidtTotZaak]);
  if (task.briefCode) rows.push(["Kenmerk", task.briefCode]);

  const watGevraagd = actionable
    ? (task.toelichting?.nl ?? "Er wordt actie van u gevraagd.")
    : task.automatisch
      ? "Dit is automatisch door de overheid geregeld. U hoeft niets te doen."
      : "Deze brief is ter informatie. U hoeft niets te doen.";

  app.innerHTML = `
    <article class="case-page plan-detail-page">
      <a class="back-link" href="#plannen"><span aria-hidden="true">←</span> Terug naar het dossier</a>
      <h1>${escapeHtml(task.titel?.nl ?? "Brief")}</h1>
      <p class="page-subtitle">Brief van ${escapeHtml(org)}</p>

      <div class="plan-detail-status">${planRowBadge(task)}</div>

      ${flags.length ? `<div class="plan-detail-flag">${flags.map((f) => `<p>⚠ ${escapeHtml(f)}</p>`).join("")}</div>` : ""}

      <section class="case-section">
        <h1>Wat wordt er gevraagd?</h1>
        <p>${escapeHtml(watGevraagd)}</p>
        ${url ? `<a class="primary-button" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(actionable ? `Regel dit bij ${org}` : `Bekijk bij ${org}`)} <span aria-hidden="true">→</span></a>` : ""}
      </section>

      <section class="case-section">
        <h1>Over deze brief</h1>
        <dl class="case-detail-list">
          ${rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("")}
        </dl>
      </section>
    </article>
  `;
  app.focus({ preventScroll: true });
}

// Tijdstip van de deadline voor sortering; taken zonder deadline achteraan.
function planDeadlineTs(task) {
  if (!task.deadline) return Infinity;
  const ts = new Date(task.deadline).getTime();
  return Number.isNaN(ts) ? Infinity : ts;
}

function orgNaam(id) {
  return organisaties[id]?.naam ?? id;
}

// Hele dagen tot de deadline (negatief = verlopen); null als er geen deadline is.
function planDaysUntil(task) {
  const ts = planDeadlineTs(task);
  if (!Number.isFinite(ts)) return null;
  return Math.ceil((ts - Date.now()) / (24 * 60 * 60 * 1000));
}

function planDagenTekst(days) {
  if (days < 0) return `${-days} ${-days === 1 ? "dag" : "dagen"} te laat`;
  if (days === 0) return "vandaag";
  return `over ${days} ${days === 1 ? "dag" : "dagen"}`;
}

// Korte datum zonder jaar ("16 juni") voor de tijdlijn/featured.
function planShortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}

// 1 uitgelichte taak: de open actie met de kortste deadline.
function planFeaturedTask() {
  return planOpenActions()
    .filter((t) => Number.isFinite(planDeadlineTs(t)))
    .sort((a, b) => planDeadlineTs(a) - planDeadlineTs(b))[0] ?? null;
}

// Uitgelichte taak als prominente, klikbare callout bovenaan.
function renderPlanFeatured() {
  const task = planFeaturedTask();
  if (!task) return "";
  const days = planDaysUntil(task);
  const org = orgNaam(task.organisatie ?? "overig");
  let kop;
  if (days < 0) kop = "1 taak is verlopen — pak deze met voorrang op";
  else if (days <= 7) kop = "1 taak moet u deze week oppakken";
  else if (days <= 14) kop = "1 taak verloopt binnen twee weken";
  else kop = "1 taak vraagt als eerste uw aandacht";
  const detail = `${task.titel?.nl ?? ""} (${org}, vóór ${planFormatDate(task.deadline)} — ${planDagenTekst(days)}).`;
  return `
    <a class="plan-featured" href="#plannen/${encodeURIComponent(task.uuid)}">
      <span class="plan-featured-icon" aria-hidden="true">⚠</span>
      <span class="plan-featured-body">
        <strong>${escapeHtml(kop)}</strong>
        <span>${escapeHtml(detail)}</span>
      </span>
      <span class="arrow" aria-hidden="true">→</span>
    </a>`;
}

// "Belangrijke documenten" — accordion met informatie en stukken rond het
// overlijden. De eerste rij vouwt de informatieve berichten (geen actie) uit;
// de rest is uitleg/FAQ.
function renderPlanDocumenten() {
  const infoBerichten = planSource()
    .filter((t) => !planActionable(t) && t.status !== "afgerond")
    .sort(planByUrgency);

  const berichtenBody = infoBerichten.length
    ? `<div class="plan-doc-links">${infoBerichten
        .map(
          (t) =>
            `<a href="#plannen/${encodeURIComponent(t.uuid)}"><span>${escapeHtml(t.titel?.nl ?? "")}</span><small>${escapeHtml(orgNaam(t.organisatie ?? "overig"))}</small></a>`,
        )
        .join("")}</div>`
    : `<p>Er zijn op dit moment geen informatieve berichten.</p>`;

  const items = [
    {
      icon: "icon-mail",
      titel: "Condoleanceberichten van organisaties",
      sub: "Berichten die geen actie vragen, ter informatie",
      body: berichtenBody,
    },
    {
      icon: "icon-folder",
      titel: "Akte van overlijden en verklaring van erfrecht",
      sub: "Officiële documenten om te bewaren en te delen",
      body: `
        <p>De <strong>akte van overlijden</strong> krijgt u van de gemeente waar Cees is overleden. U heeft deze nodig om het overlijden door te geven aan banken, verzekeraars en pensioenfondsen.</p>
        <p>Een <strong>verklaring van erfrecht</strong> vraagt u aan bij een notaris. Daarmee toont u aan dat u de erfgenaam bent en mag u bankzaken regelen namens de nalatenschap.</p>`,
    },
    {
      icon: "icon-euro",
      titel: "Waar heb ik mogelijk recht op?",
      sub: "Nabestaandenuitkering (Anw), pensioen, toeslagen",
      body: `
        <ul class="plan-doc-list">
          <li><strong>Anw-nabestaandenuitkering (SVB)</strong> — als u aan de voorwaarden voldoet, bijvoorbeeld een kind onder de 18 of arbeidsongeschiktheid.</li>
          <li><strong>Nabestaandenpensioen</strong> — via het pensioenfonds of de verzekeraar van Cees.</li>
          <li><strong>Toeslagen</strong> — uw recht op zorg- of huurtoeslag kan veranderen nu uw situatie wijzigt.</li>
        </ul>`,
    },
    {
      icon: "icon-clipboard",
      titel: "Veelgestelde vragen",
      sub: "Antwoorden op veelvoorkomende vragen na een overlijden",
      body: `
        <div class="plan-doc-faq">
          <p><strong>Moet ik alles meteen regelen?</strong><br>Nee. Veel zaken regelt de overheid automatisch. Pak eerst de taken met een deadline op; de rest heeft de tijd.</p>
          <p><strong>Waarom staan sommige brieven op naam van Cees of ‘de erven’?</strong><br>Organisaties weten nog niet altijd wie de contactpersoon is. Geeft u dit door, dan komt de post op uw naam.</p>
        </div>`,
    },
  ];

  return `
    <section class="plan-docs">
      <h2 class="plan-block-title">Belangrijke documenten</h2>
      <p class="plan-block-sub">Informatie en stukken rondom het overlijden van Cees.</p>
      <div class="plan-doc-accordion">
        ${items
          .map(
            (it) => `
          <details class="plan-doc">
            <summary class="plan-doc-head">
              <svg class="icon plan-doc-icon" aria-hidden="true"><use href="#${it.icon}"></use></svg>
              <span class="plan-doc-text"><strong>${escapeHtml(it.titel)}</strong><small>${escapeHtml(it.sub)}</small></span>
              <span class="plan-doc-chevron" aria-hidden="true">›</span>
            </summary>
            <div class="plan-doc-body">${it.body}</div>
          </details>`,
          )
          .join("")}
      </div>
    </section>`;
}

// Urgentieniveau voor de tijdlijn-stip/legenda.
function planUrgencyLevel(days) {
  if (days === null) return "later";
  if (days <= 14) return "urgent";
  if (days <= 60) return "soon";
  return "later";
}

// "Wat komt er nog aan" — inklapbare tijdlijn van openstaande acties met een
// deadline, gegroepeerd per maand en gesorteerd op datum.
function renderPlanTimeline() {
  const items = planSource()
    .filter((t) => planActionable(t) && t.status !== "afgerond" && Number.isFinite(planDeadlineTs(t)))
    .sort((a, b) => planDeadlineTs(a) - planDeadlineTs(b));
  if (!items.length) return "";

  const now = new Date();
  const curKey = `${now.getFullYear()}-${now.getMonth()}`;
  let lastKey = "";
  const rows = items
    .map((t) => {
      const d = new Date(t.deadline);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const days = planDaysUntil(t);
      const level = planUrgencyLevel(days);
      let head = "";
      if (key !== lastKey) {
        lastKey = key;
        const maand = d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
        head = `<p class="plan-tl-month">${escapeHtml(key === curKey ? `Deze maand · ${maand}` : maand)}</p>`;
      }
      const org = orgNaam(t.organisatie ?? "overig");
      const dagenCls = level === "urgent" ? ' class="plan-tl-days-urgent"' : "";
      return `
        ${head}
        <a class="plan-tl-item plan-tl-${level}" href="#plannen/${encodeURIComponent(t.uuid)}">
          <span class="plan-tl-dot" aria-hidden="true"></span>
          <strong>${escapeHtml(t.titel?.nl ?? "")}</strong>
          <small>${escapeHtml(org)} · vóór ${escapeHtml(planShortDate(t.deadline))} · <span${dagenCls}>${escapeHtml(planDagenTekst(days))}</span></small>
        </a>`;
    })
    .join("");

  return `
    <details class="plan-timeline" open>
      <summary class="plan-timeline-head">
        <span class="plan-block-title">Wat komt er nog aan</span>
        <span class="plan-timeline-chevron" aria-hidden="true">⌃</span>
      </summary>
      <a class="secondary-button plan-timeline-full" href="#taken">Volledig overzicht <span aria-hidden="true">→</span></a>
      <div class="plan-timeline-body">
        <div class="plan-tl-legend">
          <span><i class="plan-tl-dot plan-tl-urgent"></i> Urgent</span>
          <span><i class="plan-tl-dot plan-tl-soon"></i> Belangrijk, tijd genoeg</span>
          <span><i class="plan-tl-dot plan-tl-later"></i> Geen haast</span>
        </div>
        <div class="plan-tl-track">${rows}</div>
      </div>
    </details>`;
}

function renderPlannen() {
  const apiMode = planApiEnabled();
  const apiLabel = planApiBase() || location.origin;
  if (apiMode && planFetchState === "idle") fetchPlanTasks();

  const source = planSource();
  const total = source.length;
  const actionTasks = source.filter(planActionable);
  const totalActions = actionTasks.length;
  const doneActions = actionTasks.filter((task) => task.status === "afgerond").length;
  const percent = totalActions ? Math.round((doneActions / totalActions) * 100) : 0;
  const autoCount = source.filter((task) => !planActionable(task) && task.automatisch).length;

  // Twee aparte secties, beide een platte lijst op urgentie:
  // nog te doen (open acties) en geen actie nodig (de rest). Organisatie staat
  // klein onder elke titel.
  const sorted = (tasks) => [...tasks].sort(planByUrgency);
  const teDoen = sorted(source.filter((task) => planActionable(task) && task.status !== "afgerond"));
  const geregeld = sorted(source.filter((task) => !(planActionable(task) && task.status !== "afgerond")));
  const taskList = (tasks) => `<div class="plan-task-list">${tasks.map((t) => planTaskRow(t, true)).join("")}</div>`;

  const sections = `
    <section class="plannen-section">
      <div class="plannen-section-title">Nog te doen <span class="plannen-section-count">${teDoen.length}</span></div>
      ${teDoen.length ? taskList(teDoen) : `<p class="empty-line">Niets meer te doen — alles is geregeld.</p>`}
    </section>
    ${
      geregeld.length
        ? `<section class="plannen-section plannen-section-done">
             <div class="plannen-section-title">Geen actie nodig <span class="plannen-section-count">${geregeld.length}</span></div>
             ${taskList(geregeld)}
           </section>`
        : ""
    }
  `;

  let body;
  let featured = "";
  let docs = "";
  let timeline = "";
  if (apiMode && planFetchState === "loading" && !total) {
    body = `<p class="empty-line">Taken laden van ${escapeHtml(apiLabel)} …</p>`;
  } else if (apiMode && planFetchState === "error") {
    body = `<div class="empty-state"><h2>Kon de API niet bereiken</h2><p>Geen verbinding met <code>${escapeHtml(apiLabel)}</code>. Controleer of de server en tunnel draaien.</p></div>`;
  } else {
    body = sections;
    featured = renderPlanFeatured();
    docs = renderPlanDocumenten();
    timeline = renderPlanTimeline();
  }

  app.innerHTML = `
    <article class="stacked-page plannen-page">
      <section class="plannen-intro">
        <h1>Nabestaandendossier</h1>
        <p class="page-subtitle">Na het overlijden van uw partner Cees moet er veel worden geregeld. Wij hebben de brieven van de overheid voor u gebundeld zodat u ziet wat er <strong>al automatisch is geregeld</strong> en wat er nog <strong>uw aandacht</strong> vraagt.</p>
      </section>

      ${featured}

      ${docs}

      <section class="plannen-progress" aria-label="Voortgang">
        <div class="plannen-progress-head">
          <strong>${doneActions} van ${totalActions} acties afgerond</strong>
          <span>${percent}%</span>
        </div>
        <div class="plannen-progress-bar"><span style="width: ${percent}%"></span></div>
        ${autoCount ? `<p class="plannen-progress-note">✓ ${autoCount} ${autoCount === 1 ? "zaak is" : "zaken zijn"} al automatisch voor u geregeld door de overheid</p>` : ""}
      </section>

      <section>${body}</section>

      ${timeline}
    </article>
  `;
}

function openFilter() {
  modalBackdrop.hidden = false;
  filterPanel.hidden = false;
  closeFilterButton.focus();
}

function closeFilter() {
  modalBackdrop.hidden = true;
  filterPanel.hidden = true;
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    location.hash = button.dataset.route;
  });
});

closeFilterButton.addEventListener("click", closeFilter);
applyFilterButton.addEventListener("click", closeFilter);
modalBackdrop.addEventListener("click", closeFilter);

siteSearch.addEventListener("submit", (event) => {
  event.preventDefault();
  location.hash = "zaken";
  renderCases(new FormData(siteSearch).get("q") ?? "");
});

window.addEventListener("hashchange", render);

// Live updates via Server-Sent Events (alleen in API-modus): de server pusht
// een seintje als taken wijzigen (dan verversen we) of als de code wijzigt
// (dan herladen we de pagina). Zo ziet iedereen wijzigingen meteen.
let planEventSource = null;
function connectPlanEvents() {
  if (planEventSource || !planApiEnabled()) return;
  try {
    planEventSource = new EventSource(`${planApiBase()}/events`);
    planEventSource.addEventListener("message", (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === "reload") {
        location.reload();
      } else if (data.type === "taken") {
        planFetchState = "idle";
        fetchPlanTasks();
      }
    });
  } catch (err) {
    console.error("Live updates niet beschikbaar", err);
  }
}

render();
connectPlanEvents();
