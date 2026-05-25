const app = document.querySelector("#app");
const breadcrumbCurrent = document.querySelector("[data-breadcrumb-current]");
const navButtons = [...document.querySelectorAll(".side-nav button")];
const accountButton = document.querySelector(".account-button");
const accountMenu = document.querySelector(".account-menu");
const modalBackdrop = document.querySelector(".modal-backdrop");
const filterPanel = document.querySelector(".filter-panel");
const closeFilterButton = document.querySelector(".close-filter");
const applyFilterButton = document.querySelector(".apply-filter");
const siteSearch = document.querySelector(".site-search");

const cases = [
  ["Aanvraag subsidie geluidsisolatie", "17-10-2024", "Open", "Uw aanvraag is ontvangen. De gemeente beoordeelt de offerte en de ligging van de woning."],
  ["Wmo-melding", "29-9-2024", "Open", "Een medewerker neemt contact op voor een keukentafelgesprek."],
  ["Opzeggen parkeervergunning", "5-12-2023", "Open", "De vergunning loopt door tot de einddatum van de huidige betaalperiode."],
  ["Aanvraag afkoop canon Keukenlaan 133", "5-12-2023", "Open", "De aanvraag ligt bij erfpacht voor berekening van de afkoopsom."],
  ["Adres onderzoek", "5-12-2023", "Open", "Wij controleren of de gegevens in de basisregistratie kloppen."],
  ["Bezwaar tegen waardering onroerende zaken", "5-12-2023", "Open", "Het bezwaar is in behandeling bij de taxateur."],
  ["Aanvraag vakantieverhuur Dierenselaan 88", "5-12-2023", "Gesloten", "De melding is afgehandeld en toegevoegd aan uw overzicht."],
  ["Aanvraag mantelzorg parkeervergunning", "5-12-2023", "Gesloten", "De vergunning is afgegeven."],
  ["Aanvraag parkeervergunning", "5-12-2023", "Gesloten", "De aanvraag is afgerond."],
  ["Verhuizing doorgeven", "3-11-2023", "Gesloten", "De verhuizing is verwerkt in de basisregistratie."],
  ["Evenementenvergunning buurtfeest", "14-8-2023", "Gesloten", "De vergunning is verleend."],
  ["Melding openbare ruimte", "2-6-2023", "Gesloten", "De melding is afgehandeld door de buitendienst."],
];

const tasks = [
  ["Geef informatie voor uw aanvraag subsidie geluidsisolatie", "Nog 2 dagen", true],
  ["Betaal uw parkeerbon van € 74,90 voor parkeren bij Valeriusplein", "vóór 1 maart 2023", false],
  ["Betaal uw Erfpachtfactuur van € 27,52 voor Keukenhoflaan 133 voor de periode juli tot en met december 2023", "vóór 12 december 2023", false],
  ["Aanleveren extra documenten adres onderzoek", "", false],
];

const messages = [
  ["Herinnering: Informatie geven voor uw aanvraag subsidie geluidsisolatie", "Vandaag", true, "Ontvangen vandaag om 09:12 uur"],
  ["Betalen van uw parkeerbon", "15-5-2025", true, "Ontvangen op 15 mei 2025 om 18:10 uur"],
  ["Vernieuwen identiteitskaart", "22-9-2024", false, "Ontvangen op 22 september 2024 om 10:31 uur"],
  ["Tip: betaal bedragen met automatische incasso", "1-5-2024", false, "Ontvangen op 1 mei 2024 om 12:02 uur"],
];

const products = [
  ["Parkeervergunning bewoner", "Actief tot 31-12-2025", "Parkeren"],
  ["Uittreksel BRP", "Aangevraagd op 12-9-2024", "Burgerzaken"],
  ["WOZ beschikking 2024", "Beschikbaar", "WOZ"],
  ["Erfpacht contract", "Keukenlaan 133", "Erfpacht"],
];

const taxTasks = [
  ["Betaal uw gemeentelijke belasting van € 6.982,30", "vóór 1 maart 2024"],
  ["Betaal uw rioolrecht grootafvoer van € 211,30 voor aanslagnummer 2212002751", "vóór 1 april 2024"],
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
    actions: ["WOZ-waarde bekijken", "Bezwaar maken tegen WOZ-waarde", "Taxatieverslag downloaden", "Adresgegevens controleren"],
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
    tasks: [["Betaal uw parkeerbon van € 74,90 voor parkeren bij Valeriusplein", "vóór 1 maart 2023"]],
    actions: ["Parkeervergunning aanvragen", "Kenteken wijzigen", "Parkeerbon betalen", "Mantelzorgvergunning aanvragen"],
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
    tasks: [["Betaal uw Erfpachtfactuur van € 27,52 voor Keukenhoflaan 133 voor de periode juli tot en met december 2023", "vóór 12 december 2023"]],
    actions: ["Erfpachtcanon bekijken", "Afkoop canon aanvragen", "Erfpachtcontract downloaden", "Adres erfpachtobject wijzigen"],
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
    actions: ["Vakantieverhuur melden", "Nachtteller bekijken", "Melding wijzigen", "Voorwaarden vakantieverhuur bekijken"],
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

const labels = {
  overzicht: "Overzicht",
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
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.route === section));
  breadcrumbCurrent.textContent = labels[section] ?? "Overzicht";
  document.title = `${labels[section] ?? "MijnServices"} - MijnServices Demo App`;
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
  } else if (route === "agenda") {
    renderAgenda();
  } else if (route === "plan") {
    renderPlan();
  } else {
    renderTheme(route);
  }

  app.focus({ preventScroll: true });
}

function renderOverview() {
  app.innerHTML = `
    <article class="dashboard-page">
      <header class="dashboard-intro">
        <h1>Hallo Jeroen van Drouwen</h1>
        <p>In ‘Mijn omgeving’ kunt u zelf uw persoonlijke zaken regelen wanneer het u uitkomt. U kunt bijvoorbeeld uw rekeningen betalen en zien wanneer uw aanvraag klaar is.</p>
      </header>

      <section class="dashboard-section">
        <h1>Wat kan ik regelen</h1>
        <div class="quick-action-list">
          <a href="#belastingzaken"><strong>Belasting gespreid betalen met automatische incasso</strong><span aria-hidden="true">→</span></a>
          <a href="#parkeren"><strong>Parkeervergunning aanvragen of wijzigen</strong><span aria-hidden="true">→</span></a>
          <a href="#woz"><strong>WOZ-waarde bekijken of bezwaar maken</strong><span aria-hidden="true">→</span></a>
          <a href="#agenda"><strong>Afspraak bij de gemeente bekijken</strong><span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section class="dashboard-section">
        <h1>Mijn taken</h1>
        <a class="all-link" href="#taken">Bekijk alle taken (4) <span aria-hidden="true">→</span></a>
        ${taskListHtml()}
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
          ${productDashboardCard("Erfpachtcontract", "Keukenlaan 133", "1 december 2023", "1 taak open")}
          ${productDashboardCard("Verhuurontheffing", "Keukenlaan 133", "17 oktober 2021")}
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

function productDashboardCard(title, subtitle, date, badge = "") {
  return `
    <a class="dashboard-product-card" href="#producten">
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
    <table class="data-table">
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
            ["1-12-2022", "mail", "Er is naar u een herinnering verstuurd over het geven van informatie"],
            ["1-12-2022", "mail", "Er is van u gevraagd om informatie te geven"],
            ["1-12-2022", "main", "Er is naar u een tip verstuurd over recht op extra subsidie"],
            ["1-12-2022", "mail", "Status is veranderd naar ‘Onderzoek naar geluidsoverlast’"],
            ["1-12-2022", "vraag", "U heeft een vraag gesteld aan de gemeente"],
            ["1-12-2022", "telefoon", "Gesprek gehad over afspraak met adviseur"],
            ["1-12-2022", "brief", "Er is naar u een brief verstuurd over kosten onderzoek en"],
            ["1-12-2022", "mail", "Status is veranderd naar ‘Deelname aan gebruikersonderzoek’"],
            ["1-12-2022", "balie", "Bezoek gehad voor het inscannen van documenten"],
            ["1-12-2022", "brief", "Er is naar u een brief verstuurd over actie woningverbetering verkeersgeluid bewoner"],
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
  app.innerHTML = `
    <h1>Mijn taken</h1>
    ${taskListHtml()}
  `;
}

function renderMessages() {
  app.innerHTML = `
    <h1>Mijn berichten</h1>
    <table class="message-table">
      <thead>
        <tr>
          <th>Onderwerp</th>
          <th>Datum</th>
        </tr>
      </thead>
      <tbody>
        ${messages
          .map(
            ([title, date, unread], index) => `
              <tr class="${unread ? "is-unread" : ""}">
                <td data-label="Onderwerp">
                  <a class="message-link" href="#berichten/${index}">
                    ${unread ? '<span class="unread-dot" aria-label="Ongelezen"></span>' : ""}
                    <span>${escapeHtml(title)}</span>
                  </a>
                </td>
                <td data-label="Datum">${escapeHtml(date)}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
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
          ([title, text, group]) => `
            <article class="product-card">
              <span>
                <h3>${escapeHtml(title)}</h3>
                <span class="muted">${escapeHtml(text)}</span>
              </span>
              <strong>${escapeHtml(group)}</strong>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderTaxPage() {
  app.innerHTML = `
    <section class="stacked-page tax-page">
      <section>
        <h1>Mijn taken</h1>
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
        <h1>Wat kan ik regelen</h1>
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
        <h1>Mijn zaken</h1>
        <a class="tax-case-card" href="#zaken/5">
          <strong>Bezwaar tegen afvalstoffenheffing 2024</strong>
          <span>5 januari 2024</span>
          <span class="arrow" aria-hidden="true">→</span>
        </a>
      </section>

      <section>
        <h1>Aanslagen</h1>
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
                .map((caseIndex) => folderCard(`zaken/${caseIndex}`, cases[caseIndex][0], cases[caseIndex][1]))
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
                    <td data-label="Naam">${escapeHtml(name)}</td>
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

      ${profileSection("Persoonsgegevens", [
        ["Naam", "Jeroen van Drouwen"],
        ["Geboortedatum", "14 maart 1981"],
        ["Burgerservicenummer", "••••••782"],
      ], "Bekijk hoe de gemeente met persoonsgegevens omgaat")}

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

accountButton.addEventListener("click", () => {
  const isOpen = accountMenu.hidden;
  accountMenu.hidden = !isOpen;
  accountButton.setAttribute("aria-expanded", String(isOpen));
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

render();
