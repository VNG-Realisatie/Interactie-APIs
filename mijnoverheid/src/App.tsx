import { useCallback, useEffect, useState } from 'react';
import { Accordion } from '@ark-ui/react/accordion';
import { Select, createListCollection } from '@ark-ui/react/select';
import { Tabs } from '@ark-ui/react/tabs';

const themes = createListCollection({
  items: [
    { label: 'Rijksoverheid', value: 'rijk' },
    { label: 'Gemeente Utrecht', value: 'utrecht' },
    { label: 'Gemeente Den Haag', value: 'denhaag' },
    { label: 'Gemeente Veenendaal (NLDS Basis)', value: 'basis' },
  ],
});

const API_BASE_STORAGE_KEY = 'mijnoverheid-api-base';

function getDefaultApiBase() {
  if (typeof window === 'undefined') return 'https://vng-interactie-mocks.fly.dev';
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:41837'
    : 'https://vng-interactie-mocks.fly.dev';
}

function readStoredApiBase() {
  if (typeof window === 'undefined') return getDefaultApiBase();
  return localStorage.getItem(API_BASE_STORAGE_KEY) || getDefaultApiBase();
}

function normalizeApiBase(value: string) {
  return value.trim().replace(/\/$/, '');
}

const API_BASES_STORAGE_KEY = 'mijnoverheid-api-bases';

// De API's waarvoor je in de inspector een eigen endpoint kunt instellen.
const apiEndpoints: { key: string; label: string }[] = [
  { key: 'taken', label: 'MijnTaken' },
  { key: 'zaken', label: 'MijnZaken' },
  { key: 'producten', label: 'MijnProducten' },
  { key: 'agenda', label: 'MijnAgenda' },
  { key: 'gesprekken', label: 'MijnGesprekken' },
];

function readStoredApiBases(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(API_BASES_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Haalt de API-naam uit een pad als /apis/rest/{api}/...
function apiFromPath(path: string): string {
  const m = path.match(/\/apis\/rest\/([^/?#]+)/);
  return m ? m[1] : '';
}

// Het standaard-endpoint voor een API (t/m versie); dient als placeholder en
// als basis wanneer er geen eigen endpoint is ingesteld.
function defaultApiEndpoint(api: string): string {
  return `${getDefaultApiBase()}/apis/rest/${api}/next`;
}

// Leidt uit een call (/apis/rest/{api}/{versie}/{operatie}) de docs-URL af naar
// de juiste OpenAPI-spec in het API lab, inclusief Scalar-deeplink naar de
// specifieke operatie: #tag/{tag}/{METHODE}/{operatiepad}. De tag is bij deze
// API's gelijk aan het eerste pad-segment (Scalar slugificeert naar lowercase).
// De docs-app draait op de root (/) terwijl MijnOverheid op /mijnoverheid/ staat,
// dus een absoluut pad werkt in dev én prod.
function docsUrlForCall(method: string, pathOrUrl: string): string | null {
  const match = pathOrUrl.match(/\/apis\/rest\/([^/?#]+)\/([^/?#]+)(\/[^?#]*)?/);
  if (!match) return null;
  const [, api, version, restRaw] = match;
  const base = `/?url=/docs/bundled/apis_rest_${api}_${version}.yaml`;

  const rest = (restRaw || '').replace(/^\/+|\/+$/g, '');
  if (!rest) return base;

  // Concrete UUID's terugvertalen naar de path-parameter zodat het anker matcht.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const opPath = rest
    .split('/')
    .map((seg) => (uuidRe.test(seg) ? '{uuid}' : seg))
    .join('/');
  const tag = opPath.split('/')[0].toLowerCase();
  return `${base}#tag/${tag}/${method.toUpperCase()}/${opPath}`;
}

function formatLogUrl(fullUrl: string, base: string) {
  const baseNorm = normalizeApiBase(base);
  if (fullUrl.startsWith(baseNorm)) return fullUrl.slice(baseNorm.length) || '/';
  try {
    const u = new URL(fullUrl);
    return `${u.pathname}${u.search}`;
  } catch {
    return fullUrl;
  }
}

const defaultMockHeaders = {
  Authorization: 'Bearer dummy-token',
  'Content-Type': 'application/json',
  Prefer: 'code=200',
};

const customRequestDefaults = {
  method: 'POST',
  path: '/apis/rest/taken/next/context/zoek',
  body: JSON.stringify(
    {
      klantId: 'a8f3c1d2-7e44-4b1a-9c0f-123456789abc',
      include: ['taken'],
    },
    null,
    2,
  ),
};

type PageKey =
  | 'home'
  | 'dossier'
  | 'taken'
  | 'berichten'
  | 'zaken'
  | 'producten'
  | 'belastingzaken'
  | 'woz'
  | 'parkeren'
  | 'erfpacht'
  | 'vakantieverhuur'
  | 'agenda'
  | 'plan'
  | 'gegevens'
  | 'brief'
  | 'zaak-detail';

type NavItem = { label: string; icon: string; key: PageKey; badge?: number };
const nav: NavItem[] = [
  { label: 'Home', icon: 'icon-grid', key: 'home' },
  { label: 'Nabestaandendossier', icon: 'icon-clipboard', key: 'dossier' },
  { label: 'Mijn taken', icon: 'icon-checks', key: 'taken' },
  { label: 'Mijn berichten', icon: 'icon-mail', key: 'berichten', badge: 9 },
  { label: 'Mijn zaken', icon: 'icon-folder', key: 'zaken' },
  { label: 'Mijn producten', icon: 'icon-card', key: 'producten' },
  { label: 'Belastingzaken', icon: 'icon-euro', key: 'belastingzaken' },
  { label: 'WOZ', icon: 'icon-home', key: 'woz' },
  { label: 'Parkeren', icon: 'icon-parking', key: 'parkeren' },
  { label: 'Erfpacht', icon: 'icon-building', key: 'erfpacht' },
  { label: 'Vakantieverhuur', icon: 'icon-bed', key: 'vakantieverhuur' },
  { label: 'Mijn agenda', icon: 'icon-calendar', key: 'agenda' },
  { label: 'Mijn plan', icon: 'icon-plan', key: 'plan' },
  { label: 'Mijn gegevens', icon: 'icon-user', key: 'gegevens' },
];
const labels: Record<string, string> = {
  ...Object.fromEntries(nav.map((n) => [n.key, n.label])),
  brief: 'Contactpersoon doorgeven aan de Belastingdienst',
  'zaak-detail': 'Zaak detail',
};

// Volledige takenlijst voor de Mijn taken-pagina, met categorie + status.
type TaakCat = 'belangrijkste' | 'ingevuld' | 'geenactie';
type Taak = { titel: string; org: string; deadline?: string; ai?: boolean; terInfo?: boolean; automatisch?: boolean; cat: TaakCat; raw?: any };
const takenOpenDefault: Taak[] = [
  { titel: 'Contactpersoon doorgeven aan de Belastingdienst', org: 'Belastingdienst', deadline: 'vóór 2 juli 2026', cat: 'belangrijkste' },
  { titel: 'Aanslag waterschapsbelasting betalen', org: 'Waterschap', deadline: 'vóór 7 augustus 2026', cat: 'belangrijkste' },
  { titel: 'Terugvordering zorgtoeslag — betalen of bezwaar', org: 'Dienst Toeslagen', deadline: 'vóór 18 juli 2026', ai: true, cat: 'ingevuld' },
  { titel: 'Aangifte erfbelasting indienen', org: 'Belastingdienst', deadline: 'vóór 28 april 2027', ai: true, cat: 'ingevuld' },
  { titel: 'Voertuig op naam van Cees — informatie', org: 'RDW', terInfo: true, cat: 'geenactie' },
  { titel: 'Overlijdensuitkering AOW', org: 'Sociale Verzekeringsbank', terInfo: true, cat: 'geenactie' },
  { titel: 'Zorgtoeslag herzien (beschikking)', org: 'Dienst Toeslagen', terInfo: true, automatisch: true, cat: 'geenactie' },
  { titel: 'Condoleancebericht van het CAK', org: 'CAK', terInfo: true, cat: 'geenactie' },
  { titel: 'Condoleancebericht van de gemeente', org: 'Gemeente', terInfo: true, cat: 'geenactie' },
];
const takenDoneDefault: Taak[] = [
  { titel: 'WLZ-eigen bijdrage CAK stopgezet', org: 'CAK', terInfo: true, cat: 'geenactie' },
];
const takenFilters: { key: 'alle' | TaakCat; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'belangrijkste', label: 'Belangrijkste' },
  { key: 'ingevuld', label: 'Ingevuld door AI' },
  { key: 'geenactie', label: 'Geen actie nodig' },
];

const zaken = [
  { titel: 'Aanvraag subsidie geluidisolatie', id: 'ZK-29124' },
  { titel: 'WMO-melding', id: 'ZK-02612' },
  { titel: 'Aanvraag parkeervergunning', id: 'ZK-02599' },
];

const berichtenDefault = [
  { org: 'Belastingdienst', titel: 'Aangifte erfbelasting indienen', datum: '30 augustus 2026', ongelezen: true },
  { org: 'Waterschap', titel: 'Aanslag waterschapsbelasting betalen', datum: '25 juni 2026', ongelezen: true },
  { org: 'CAK', titel: 'Eindafrekening eigen bijdrage Wlz betalen', datum: '10 juni 2026' },
  { org: 'Dienst Toeslagen', titel: 'Terugvordering zorgtoeslag — betalen of bezwaar', datum: '5 juni 2026', ongelezen: true },
  { org: 'Belastingdienst', titel: 'Contactpersoon doorgeven aan de Belastingdienst', datum: '1 juni 2026', ongelezen: true },
  { org: 'Dienst Toeslagen', titel: 'Zorgtoeslag herzien (beschikking)', datum: '29 mei 2026' },
  { org: 'RDW', titel: 'Voertuig op naam van Cees — informatie', datum: '22 mei 2026' },
  { org: 'Sociale Verzekeringsbank', titel: 'Overlijdensuitkering AOW', datum: '22 mei 2026' },
  { org: 'CAK', titel: 'Condoleancebericht van het CAK', datum: '20 mei 2026' },
  { org: 'Gemeente', titel: 'Condoleancebericht van de gemeente', datum: '19 mei 2026' },
];

const zakenLijst = [
  { naam: 'Aanvraag subsidie geluidisolatie', datum: '17-10-2024', status: 'Open' },
  { naam: 'Wmo-melding', datum: '29-9-2024', status: 'Open' },
  { naam: 'Opzeggen parkeervergunning', datum: '5-12-2023', status: 'Open' },
  { naam: 'Aanvraag afkoop canon Keukenlaan 133', datum: '5-12-2023', status: 'Open' },
  { naam: 'Adres onderzoek', datum: '5-12-2023', status: 'Open' },
  { naam: 'Bezwaar tegen waardering onroerende zaken', datum: '5-12-2023', status: 'Open' },
  { naam: 'Aanvraag vakantieverhuur Dierenselaan 88', datum: '5-12-2023', status: 'Gesloten' },
  { naam: 'Aanvraag mantelzorg parkeervergunning', datum: '5-12-2023', status: 'Gesloten' },
  { naam: 'Aanvraag parkeervergunning', datum: '5-12-2023', status: 'Gesloten' },
  { naam: 'Verhuizing doorgeven', datum: '3-11-2023', status: 'Gesloten' },
];

const documenten = [
  { titel: 'Akte van overlijden', org: 'Gemeente', tekst: 'Het officiële uittreksel uit de registers van de burgerlijke stand.' },
  { titel: 'Verklaring van erfrecht', org: 'Notaris', tekst: 'Toont wie de erfgenamen zijn en wie de nalatenschap mag afhandelen.' },
  { titel: 'Overzicht mogelijke rechten', org: 'SVB', tekst: 'Mogelijk recht op Anw-uitkering of nabestaandenpensioen.' },
];

const briefMeta = [
  ['Afzender', 'Belastingdienst'],
  ['Soort brief', 'Actiebrief'],
  ['Ontvangen', '1 juni 2026'],
  ['Aanhef', 'Aan de erven van'],
  ['Gericht aan', 'De erven van de overledene'],
  ['Bezorgd op', 'Zorgcentrum De Wilg 1, 3511 AB Utrecht — verzorgingstehuis'],
  ['Uiterlijk reageren', 'vóór 2 juli 2026'],
  ['Leidt tot zaak', 'Contactpersoon doorgeven aan Belastingdienst'],
  ['Kenmerk', 'BD.ERVENBRIEF'],
];

type ThemeData = {
  title: string;
  tasks: [string, string][];
  actions: string[];
  itemsTitle: string;
  itemsHead: [string, string, string];
  items: [string, string, string][];
};
const themeData: Record<string, ThemeData> = {
  woz: {
    title: 'WOZ',
    tasks: [['Geef meer informatie over uw WOZ-bezwaar', 'vóór 2 juni 2026']],
    actions: ['WOZ-waarde bekijken', 'Bezwaar maken tegen WOZ-waarde', 'Taxatieverslag downloaden', 'Adresgegevens controleren'],
    itemsTitle: 'WOZ-objecten',
    itemsHead: ['Object', 'Beschikking', 'Waarde'],
    items: [
      ['Keukenlaan 133', 'WOZ-waarde 2024', '€ 438.000'],
      ['Garagebox Valeriusplein', 'WOZ-waarde 2024', '€ 34.000'],
      ['Keukenlaan 133', 'WOZ-waarde 2023', '€ 412.000'],
      ['Keukenlaan 133', 'WOZ-waarde 2022', '€ 389.000'],
    ],
  },
  parkeren: {
    title: 'Parkeren',
    tasks: [['Betaal uw parkeerbon van € 74,90 voor parkeren bij Valeriusplein', 'vóór 1 maart 2026']],
    actions: ['Parkeervergunning aanvragen', 'Kenteken wijzigen', 'Parkeerbon betalen', 'Mantelzorgvergunning aanvragen'],
    itemsTitle: 'Parkeerproducten',
    itemsHead: ['Product', 'Kenmerk', 'Status'],
    items: [
      ['Parkeervergunning bewoners', '34-FJT-23', 'Actief'],
      ['Parkeerbon', '34-FJT-23', 'Nog te betalen'],
      ['Mantelzorgvergunning', 'Keukenlaan 133', 'Verleend'],
      ['Bezoekersregeling', 'Zone Centrum', 'Actief'],
    ],
  },
  erfpacht: {
    title: 'Erfpacht',
    tasks: [['Betaal uw erfpachtfactuur van € 27,52 voor Keukenhoflaan 133 (juli–december 2025)', 'vóór 12 december 2025']],
    actions: ['Erfpachtcanon bekijken', 'Afkoop canon aanvragen', 'Erfpachtcontract downloaden', 'Adres erfpachtobject wijzigen'],
    itemsTitle: 'Erfpachtcontracten',
    itemsHead: ['Object', 'Onderdeel', 'Status'],
    items: [
      ['Keukenlaan 133', 'Contract 2023', '1 taak open'],
      ['Keukenlaan 133', 'Factuur juli–december', 'Nog te betalen'],
      ['Keukenlaan 133', 'Afkoopberekening', 'In behandeling'],
      ['Keukenlaan 133', 'Canon overzicht', 'Beschikbaar'],
    ],
  },
  vakantieverhuur: {
    title: 'Vakantieverhuur',
    tasks: [],
    actions: ['Vakantieverhuur melden', 'Nachtteller bekijken', 'Melding wijzigen', 'Voorwaarden vakantieverhuur bekijken'],
    itemsTitle: 'Meldingen vakantieverhuur',
    itemsHead: ['Object', 'Onderdeel', 'Status'],
    items: [
      ['Dierenselaan 88', 'Melding 2024', 'Afgehandeld'],
      ['Dierenselaan 88', 'Nachtteller', '18 nachten gebruikt'],
      ['Dierenselaan 88', 'Voorwaarden', 'Beschikbaar'],
      ['Dierenselaan 88', 'Correspondentie', '2 berichten'],
    ],
  },
};

const productenDefault = [
  { titel: 'Erfpachtcontract', sub: 'Keukenhoflaan 133', groep: 'Erfpacht' },
  { titel: 'Verhuurontheffing', sub: 'Dierenselaan 88', groep: 'Vakantieverhuur' },
  { titel: 'Parkeervergunning bewoners', sub: '34-FJT-23', groep: 'Parkeren' },
  { titel: 'Parkeerbon', sub: '34-FJT-23', groep: 'Parkeren' },
];

const taxTasks: [string, string][] = [
  ['Betaal uw gemeentelijke belasting van € 6.982,30', 'vóór 1 maart 2026'],
  ['Betaal uw rioolrecht grootafvoer van € 211,30 (aanslagnummer 2212002751)', 'vóór 1 april 2026'],
  ['Geef meer informatie over uw bezwaar tegen afvalstoffenheffing 2026', 'vóór 2 juni 2026'],
];
const taxActions = [
  'Bezwaar maken tegen een aanslag',
  'Meerdere documenten in één keer downloaden',
  'Belasting gespreid betalen met automatische incasso',
  'Betalingsregeling aanvragen',
];

const afsprakenDefault = [
  { titel: 'Keukentafelgesprek Wmo-melding', wanneer: 'Maandag 7 oktober 2026, 10.30 uur', actie: 'Wijzigen of annuleren' },
  { titel: 'Balieafspraak identiteitskaart vernieuwen', wanneer: 'Dinsdag 22 oktober 2026, 14.15 uur', actie: 'Zet in eigen agenda' },
];

// Helper functions for mapping mock API data
const getOrgName = (taak: any) => {
  if (taak.context?.canonicalUrl) {
    try {
      const url = new URL(taak.context.canonicalUrl);
      if (url.hostname.includes('belastingdienst')) return 'Belastingdienst';
      if (url.hostname.includes('toeslagen')) return 'Dienst Toeslagen';
      if (url.hostname.includes('svb')) return 'Sociale Verzekeringsbank';
      if (url.hostname.includes('cak')) return 'CAK';
      if (url.hostname.includes('rdw')) return 'RDW';
      if (url.hostname.includes('gemeente')) return 'Gemeente';
    } catch (e) {}
  }
  if (taak.context?.urn) {
    if (taak.context.urn.includes('gemeente')) return 'Gemeente';
    if (taak.context.urn.includes('belastingdienst')) return 'Belastingdienst';
  }
  return 'Gemeente';
};

const formatDeadline = (isoString?: string) => {
  if (!isoString) return undefined;
  try {
    const date = new Date(isoString);
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    return `vóór ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (e) {
    return isoString;
  }
};

const formatAfspraakWhen = (startStr: string, endStr?: string) => {
  try {
    const start = new Date(startStr);
    const days = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    const dayName = days[start.getDay()];
    const monthName = months[start.getMonth()];
    const time = start.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    return `${dayName} ${start.getDate()} ${monthName} ${start.getFullYear()}, ${time} uur`;
  } catch (e) {
    return startStr;
  }
};

const formatConversationDate = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (e) {
    return isoString || '';
  }
};
const planDoelen = [
  { titel: 'Rust in administratie', meta: '2 open taken' },
  { titel: 'Passende ondersteuning thuis', meta: '1 afspraak gepland' },
];

const faqs = [
  {
    q: 'Ik heb een vraag over de inhoud van een bericht.',
    a: 'MijnOverheid kan u niet helpen bij de inhoud van de berichten die u ontvangt. Neem contact op met de organisatie waarvan u het bericht heeft ontvangen. De contactgegevens staan in de brief die als bijlage bij het bericht zit.',
  },
  {
    q: 'Hoe weet ik wat er al automatisch is geregeld?',
    a: 'In uw Nabestaandendossier ziet u per onderwerp of er nog actie nodig is of dat het al automatisch is geregeld. Taken met het label “Geen actie nodig” zijn alleen ter informatie.',
  },
  {
    q: 'Bij wie kan ik terecht voor hulp?',
    a: 'Bel 1400 (maandag tot en met vrijdag van 8.00 tot 20.00 uur) of stel uw vraag via vragen@mijn.overheid.nl.',
  },
];

// Merkidentiteit per huisstijl: logo (lint = staand Rijkslint, mark = gemeentewapen) + naam.
type Brand = { name: string; lint?: string; mark?: string };
const brands: Record<string, Brand> = {
  rijk: { name: 'MijnOverheid', lint: 'rijksoverheid-lint.svg' },
  utrecht: { name: 'Gemeente Utrecht', mark: 'logos/utrecht.svg' },
  denhaag: { name: 'Den Haag', mark: 'logos/denhaag.svg' },
  basis: { name: 'Gemeente Veenendaal' },
};

function Icon({ id, className = 'icon' }: { id: string; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}

function useHashRoute(): [PageKey, (p: PageKey) => void] {
  const read = (): PageKey => {
    const h = window.location.hash.replace(/^#\/?/, '') as PageKey;
    return h in labels ? h : 'home';
  };
  const [page, setPage] = useState<PageKey>(read);
  useEffect(() => {
    const onHash = () => setPage(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (p: PageKey) => {
    window.location.hash = `/${p}`;
    window.scrollTo(0, 0);
  };
  return [page, go];
}

function navLink(go: (p: PageKey) => void, p: PageKey) {
  return (e: { preventDefault: () => void }) => {
    e.preventDefault();
    go(p);
  };
}



function HomePage({ go, takenOpen, onTaakClick }: { go: (p: PageKey) => void; takenOpen: Taak[]; onTaakClick: (t: Taak) => void }) {
  const openCount = takenOpen.filter(t => t.cat === 'belangrijkste' || t.cat === 'ingevuld').length;
  return (
    <>
      <h1>Hallo Jeroen van Drouwen</h1>
      <p className="intro">
        In ‘Mijn omgeving’ kunt u zelf uw persoonlijke zaken regelen wanneer het u uitkomt. U kunt bijvoorbeeld uw
        rekeningen betalen en zien wanneer uw aanvraag klaar is.
      </p>

      <a className="dossier" href="#/dossier" onClick={navLink(go, 'dossier')}>
        <span className="dossier__icon">
          <Icon id="icon-clipboard" />
        </span>
        <span>
          <span className="dossier__title">Nabestaandendossier</span>
          <span className="dossier__text">
            Na het overlijden van uw partner Cees moet er veel geregeld worden. Bekijk gebundeld wat er al automatisch
            is geregeld en wat nog uw aandacht vraagt.
          </span>
        </span>
        <span className="dossier__cta">
          {openCount} taken openstaand <Icon id="icon-arrow" />
        </span>
      </a>

      <section className="section">
        <h2>Mijn taken</h2>
        <a className="section__link" href="#/taken" onClick={navLink(go, 'taken')}>
          Bekijk alle taken ({takenOpen.length}) <Icon id="icon-arrow" />
        </a>
        <div className="panel taken-panel">
          {takenOpen.slice(0, 4).map((t) => (
            <TaakPanelRow key={t.titel} taak={t} onClick={() => onTaakClick(t)} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Mijn lopende zaken</h2>
        <a className="section__link" href="#/zaken" onClick={navLink(go, 'zaken')}>
          Bekijk alle zaken (10) <Icon id="icon-arrow" />
        </a>
        <div className="cards">
          {zaken.map((z) => (
            <a className="card" href="#/zaken" key={z.id} onClick={navLink(go, 'zaken')}>
              <span className="card__title">{z.titel}</span>
              <span className="card__id">
                {z.id} <Icon id="icon-arrow" />
              </span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function TaakPanelRow({ taak, onClick }: { taak: Taak; onClick?: () => void }) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <a className="task" href="#/brief" onClick={handleClick}>
      <span className="task__main">
        <span className="task__title">
          {taak.titel}
          {taak.ai && <span className="task__pill">Ingevuld door AI</span>}
        </span>
        <span className="task__org">{taak.org}</span>
      </span>
      {taak.terInfo ? (
        <span className="task__info">Ter info</span>
      ) : (
        <span className="task__deadline">{taak.deadline}</span>
      )}
      <span className="task__arrow">
        <Icon id="icon-arrow" />
      </span>
    </a>
  );
}

function TabCount({ children }: { children: number }) {
  return <span className="tab-count">{children}</span>;
}

function TakenPage({ takenOpen, takenDone, onTaakClick }: { takenOpen: Taak[]; takenDone: Taak[]; onTaakClick: (t: Taak) => void }) {
  const [query, setQuery] = useState('');

  const matches = (t: Taak) =>
    query.trim() === '' || `${t.titel} ${t.org}`.toLowerCase().includes(query.toLowerCase());
  const openFiltered = takenOpen.filter(matches);
  const doneFiltered = takenDone.filter(matches);

  const renderSearchBar = () => (
    <div className="zaken-toolbar">
      <input
        type="search"
        placeholder="Zoek in taken…"
        aria-label="Zoek in taken"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button className="button-primary" type="button">
        Zoeken
      </button>
    </div>
  );

  return (
    <>
      <h1>Mijn taken</h1>
      <p className="page-sub">Alle taken en brieven uit uw nabestaandendossier.</p>

      <Tabs.Root defaultValue="open" className="tabs">
        <Tabs.List className="tabs__list">
          <Tabs.Trigger value="open">
            Open taken <TabCount>{takenOpen.length}</TabCount>
          </Tabs.Trigger>
          <Tabs.Trigger value="afgerond">
            Afgerond <TabCount>{takenDone.length}</TabCount>
          </Tabs.Trigger>
          <Tabs.Indicator className="tabs__indicator" />
        </Tabs.List>

        <Tabs.Content value="open">
          {renderSearchBar()}

          <div className="panel taken-panel">
            {openFiltered.length ? (
              openFiltered.map((t) => <TaakPanelRow key={t.titel} taak={t} onClick={() => onTaakClick(t)} />)
            ) : (
              <p className="panel-empty">Geen taken gevonden.</p>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="afgerond">
          {renderSearchBar()}

          <div className="panel taken-panel">
            {doneFiltered.length ? (
              doneFiltered.map((t) => (
                <TaakPanelRow key={t.titel} taak={t} onClick={() => onTaakClick(t)} />
              ))
            ) : (
              <p className="panel-empty">Geen afgeronde taken gevonden.</p>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}

const parseDeadlineDate = (t: Taak): Date | null => {
  if (t.raw?.deadline) {
    const d = new Date(t.raw.deadline);
    if (!isNaN(d.getTime())) return d;
  }
  if (t.deadline) {
    const match = t.deadline.match(/vóór\s+(\d+)\s+([a-z]+)\s+(\d{4})/i);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      const year = parseInt(match[3], 10);
      const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
      const monthIdx = months.indexOf(monthStr);
      if (monthIdx !== -1) {
        return new Date(year, monthIdx, day);
      }
    }
  }
  return null;
};

const getDaysUntil = (date: Date): number => {
  const diffTime = date.getTime() - Date.now();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getDagenTekst = (days: number): string => {
  if (days < 0) return `${-days} ${-days === -1 ? 'dag' : 'dagen'} te laat`;
  if (days === 0) return 'vandaag';
  return `over ${days} ${days === 1 ? 'dag' : 'dagen'}`;
};

const getUrgencyLevel = (days: number | null): 'urgent' | 'soon' | 'later' => {
  if (days === null) return 'later';
  if (days <= 14) return 'urgent';
  if (days <= 60) return 'soon';
  return 'later';
};

function DossierPage({ takenOpen, takenDone, onTaakClick }: { takenOpen: Taak[]; takenDone: Taak[]; onTaakClick: (t: Taak) => void }) {
  const [timelineOpen, setTimelineOpen] = useState(true);

  // 1. Calculate progress metrics
  const actionOpen = takenOpen.filter(t => !t.terInfo && !t.automatisch && t.cat !== 'geenactie');
  const actionDone = takenDone.filter(t => !t.terInfo && !t.automatisch);
  
  const totalActions = actionOpen.length + actionDone.length;
  const doneActions = actionDone.length;
  const percent = totalActions ? Math.round((doneActions / totalActions) * 100) : 0;
  
  const autoCount = [
    ...takenOpen.filter(t => t.automatisch),
    ...takenDone.filter(t => t.automatisch)
  ].length;

  // 2. Featured task: open actionable task with shortest deadline
  const tasksWithDates = actionOpen
    .map(t => ({ task: t, date: parseDeadlineDate(t) }))
    .filter(item => item.date !== null)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());

  const featured = tasksWithDates[0] || null;
  let featuredKop = '';
  let featuredDetail = '';
  if (featured) {
    const days = getDaysUntil(featured.date!);
    const org = featured.task.org;
    if (days < 0) {
      featuredKop = '1 taak is verlopen — pak deze met voorrang op';
    } else if (days <= 7) {
      featuredKop = '1 taak moet u deze week oppakken';
    } else if (days <= 14) {
      featuredKop = '1 taak verloopt binnen twee weken';
    } else {
      featuredKop = '1 taak vraagt als eerste uw aandacht';
    }
    const daysText = getDagenTekst(days);
    featuredDetail = `${featured.task.titel} (${org}, ${featured.task.deadline} — ${daysText}).`;
  }

  // 3. Preview lists
  const belangrijkste = takenOpen.filter(t => t.cat === 'belangrijkste' && !t.ai && !t.terInfo && !t.automatisch);
  const ingevuld = takenOpen.filter(t => t.cat === 'ingevuld' || t.ai);
  const geenActie = [
    ...takenOpen.filter(t => t.cat === 'geenactie' || t.terInfo || t.automatisch),
    ...takenDone
  ];

  const renderPreviewRow = (t: Taak) => {
    const isDone = takenDone.some(done => done.titel === t.titel);
    
    // badge logic
    let badge = null;
    if (isDone) {
      badge = <span className="plan-status is-done">✓ Afgerond</span>;
    } else if (t.automatisch) {
      badge = <span className="plan-status is-auto">✓ Geregeld</span>;
    } else if (t.terInfo) {
      badge = <span className="plan-status is-info">Ter info</span>;
    } else if (t.deadline) {
      const date = parseDeadlineDate(t);
      if (date) {
        const days = getDaysUntil(date);
        if (days < 0) {
          badge = <span className="urgent-badge">Te laat</span>;
        } else if (days <= 14) {
          badge = <span className="urgent-badge">Nog {days} {days === 1 ? 'dag' : 'dagen'}</span>;
        } else {
          badge = <span className="task-due">{t.deadline}</span>;
        }
      } else {
        badge = <span className="task-due">{t.deadline}</span>;
      }
    }
    
    return (
      <a 
        key={t.titel} 
        className="plan-preview-row" 
        href="#/brief" 
        onClick={(e) => { e.preventDefault(); onTaakClick(t); }}
      >
        <span className="plan-preview-row-main">
          <span className="plan-preview-row-title">
            {t.titel}
            {t.ai && <span className="taak-label">Ingevuld door AI</span>}
          </span>
          <small className="plan-preview-row-org">{t.org}</small>
        </span>
        {badge}
        <span className="arrow" aria-hidden="true">→</span>
      </a>
    );
  };

  const renderPreviewBox = (title: string, tasks: Taak[]) => {
    return (
      <section className="plan-preview" key={title}>
        <div className="plan-preview-head">
          <h3 className="plan-preview-title">
            {title} <span className="plannen-section-count">{tasks.length}</span>
          </h3>
          <a className="plan-preview-all" href="#/taken">
            Bekijk alle taken <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="plan-preview-list">
          {tasks.length ? (
            tasks.slice(0, 3).map(renderPreviewRow)
          ) : (
            <p className="empty-line">Geen taken.</p>
          )}
        </div>
      </section>
    );
  };

  // 4. Timeline
  const timelineItems = actionOpen
    .map(t => ({ task: t, date: parseDeadlineDate(t) }))
    .filter(item => item.date !== null)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  let lastKey = '';
  const timelineElements = [];
  
  for (const item of timelineItems) {
    const d = item.date!;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const days = getDaysUntil(d);
    const urgency = getUrgencyLevel(days);
    
    if (key !== lastKey) {
      lastKey = key;
      const maand = d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
      const isCurrentMonth = d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      timelineElements.push(
        <p key={`month-${key}`} className="plan-tl-month">
          {isCurrentMonth ? `Deze maand · ${maand}` : maand}
        </p>
      );
    }
    
    const org = item.task.org;
    const isUrgent = urgency === 'urgent';
    const shortDate = d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
    const daysText = getDagenTekst(days);
    
    timelineElements.push(
      <a 
        key={`item-${item.task.titel}`}
        className={`plan-tl-item plan-tl-${urgency}`} 
        href="#/brief"
        onClick={(e) => { e.preventDefault(); onTaakClick(item.task); }}
      >
        <span className="plan-tl-dot" aria-hidden="true" />
        <strong>{item.task.titel}</strong>
        <small>
          {org} · vóór {shortDate} · <span className={isUrgent ? 'plan-tl-days-urgent' : ''}>{daysText}</span>
        </small>
      </a>
    );
  }

  // 5. Documents / Accordion
  const infoBerichten = takenOpen.filter(t => t.terInfo || t.cat === 'geenactie');
  
  const condoleanceBody = infoBerichten.length ? (
    <div className="plan-doc-links">
      {infoBerichten.map(t => (
        <a 
          key={t.titel} 
          href="#/brief" 
          onClick={(e) => { e.preventDefault(); onTaakClick(t); }}
        >
          <span>{t.titel}</span>
          <small>{t.org}</small>
        </a>
      ))}
    </div>
  ) : (
    <p>Er zijn op dit moment geen informatieve berichten.</p>
  );

  const documentenItems = [
    {
      icon: 'icon-mail',
      titel: 'Condoleanceberichten van organisaties',
      sub: 'Berichten die geen actie vragen, ter informatie',
      body: condoleanceBody,
    },
    {
      icon: 'icon-folder',
      titel: 'Akte van overlijden en verklaring van erfrecht',
      sub: 'Officiële documenten om te bewaren en te delen',
      body: (
        <>
          <p>De <strong>akte van overlijden</strong> krijgt u van de gemeente waar Cees is overleden. U heeft deze nodig om het overlijden door te geven aan banken, verzekeraars en pensioenfondsen.</p>
          <p>Een <strong>verklaring van erfrecht</strong> vraagt u aan bij een notaris. Daarmee toont u aan dat u de erfgenaam bent en mag u bankzaken regelen namens de nalatenschap.</p>
        </>
      ),
    },
    {
      icon: 'icon-euro',
      titel: 'Waar heb ik mogelijk recht op?',
      sub: 'Nabestaandenuitkering (Anw), pensioen, toeslagen',
      body: (
        <ul className="plan-doc-list">
          <li><strong>Anw-nabestaandenuitkering (SVB)</strong> — als u aan de voorwaarden voldoet, bijvoorbeeld een kind onder de 18 of arbeidsongeschiktheid.</li>
          <li><strong>Nabestaandenpensioen</strong> — via het pensioenfonds of de verzekeraar van Cees.</li>
          <li><strong>Toeslagen</strong> — uw recht op zorg- of huurtoeslag kan veranderen nu uw situatie wijzigt.</li>
        </ul>
      ),
    },
    {
      icon: 'icon-clipboard',
      titel: 'Veelgestelde vragen',
      sub: 'Antwoorden op veelvoorkomende vragen na een overlijden',
      body: (
        <div className="plan-doc-faq">
          <p><strong>Moet ik alles meteen regelen?</strong><br />Nee. Veel zaken regelt de overheid automatisch. Pak eerst de taken met een deadline op; de rest heeft de tijd.</p>
          <p><strong>Waarom staan sommige brieven op naam van Cees of ‘de erven’?</strong><br />Organisaties weten nog niet altijd wie de contactpersoon is. Geeft u dit door, dan komt de post op uw naam.</p>
        </div>
      ),
    },
  ];

  return (
    <article className="stacked-page plannen-page">
      <section className="plannen-intro">
        <h1>Nabestaandendossier</h1>
        <p className="page-subtitle">
          Na het overlijden van uw partner Cees moet er veel worden geregeld. Wij hebben de brieven van de overheid voor u gebundeld zodat u ziet wat er <strong>al automatisch is geregeld</strong> en wat er nog <strong>uw aandacht</strong> vraagt.
        </p>
      </section>

      {featured && (
        <a 
          className="plan-featured" 
          href="#/brief" 
          onClick={(e) => { e.preventDefault(); onTaakClick(featured.task); }}
        >
          <span className="plan-featured-icon" aria-hidden="true">⚠</span>
          <span className="plan-featured-body">
            <strong>{featuredKop}</strong>
            <span>{featuredDetail}</span>
          </span>
          <span className="arrow" aria-hidden="true">→</span>
        </a>
      )}

      <section className="plannen-progress" aria-label="Voortgang">
        <div className="plannen-progress-head">
          <strong>{doneActions} van {totalActions} acties afgerond</strong>
          <span>{percent}%</span>
        </div>
        <div className="plannen-progress-bar">
          <span style={{ width: `${percent}%` }} />
        </div>
        {autoCount > 0 && (
          <p className="plannen-progress-note">
            ✓ {autoCount} {autoCount === 1 ? 'zaak is' : 'zaken zijn'} al automatisch voor u geregeld door de overheid
          </p>
        )}
      </section>

      <div className="plan-preview-grid">
        {renderPreviewBox('Belangrijkste taken', belangrijkste)}
        {renderPreviewBox('Ingevulde taken', ingevuld)}
        {renderPreviewBox('Geen actie nodig', geenActie)}
      </div>

      {timelineItems.length > 0 && (
        <details className="plan-timeline" open={timelineOpen} onToggle={(e) => setTimelineOpen(e.currentTarget.open)}>
          <summary className="plan-timeline-head">
            <span className="plan-block-title">Wat komt er nog aan</span>
            <span className="plan-timeline-chevron" aria-hidden="true">⌃</span>
          </summary>
          <a className="button plan-timeline-full" href="#/taken" style={{ marginTop: 0 }}>
            Volledig overzicht <span aria-hidden="true">→</span>
          </a>
          <div className="plan-timeline-body">
            <div className="plan-tl-legend">
              <span><i className="plan-tl-dot plan-tl-urgent" /> Urgent</span>
              <span><i className="plan-tl-dot plan-tl-soon" /> Belangrijk, tijd genoeg</span>
              <span><i className="plan-tl-dot plan-tl-later" /> Geen haast</span>
            </div>
            <div className="plan-tl-track">
              {timelineElements}
            </div>
          </div>
        </details>
      )}

      <section className="plan-docs">
        <h2 className="plan-block-title">Belangrijke documenten</h2>
        <p className="plan-block-sub">Informatie en stukken rondom het overlijden van Cees.</p>
        
        <Accordion.Root collapsible className="plan-doc-accordion">
          {documentenItems.map((d) => (
            <Accordion.Item key={d.titel} value={d.titel} className="plan-doc">
              <Accordion.ItemTrigger className="plan-doc-head">
                <Icon id={d.icon} className="icon plan-doc-icon" />
                <span className="plan-doc-text">
                  <strong>{d.titel}</strong>
                  <small>{d.sub}</small>
                </span>
                <Accordion.ItemIndicator className="plan-doc-chevron">›</Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="plan-doc-body">{d.body}</Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </section>
    </article>
  );
}

function BerichtenPage({ go, berichten }: { go: (p: PageKey) => void; berichten: any[] }) {
  return (
    <>
      <h1>Mijn berichten</h1>
      <p className="page-sub">
        Post van de overheid na het overlijden van uw partner Cees, gebundeld vanuit uw Nabestaandendossier.
      </p>
      <div className="panel berichten">
        {berichten.map((b) => (
          <a className="table-row" href="#/brief" key={b.titel} onClick={navLink(go, 'brief')}>
            <span>
              <span className="bericht__org">{b.org}</span>
              <span className="bericht__subject">
                {b.ongelezen && <span className="bericht__dot" aria-label="Ongelezen" />}
                {b.titel}
              </span>
            </span>
            <span className="bericht__date">{b.datum}</span>
          </a>
        ))}
      </div>
    </>
  );
}

function ZakenPage({ cases, onCaseClick }: { cases: any[]; onCaseClick: (uuid: string) => void }) {
  const [query, setQuery] = useState('');

  const matches = (z: any) =>
    query.trim() === '' || 
    `${z.naam} ${z.zaaknummer}`.toLowerCase().includes(query.toLowerCase());

  const openCases = cases.filter(z => z.status === 'Open' || z.status?.toLowerCase() === 'open');
  const closedCases = cases.filter(z => z.status === 'Gesloten' || z.status?.toLowerCase() === 'gesloten');

  const openFiltered = openCases.filter(matches);
  const closedFiltered = closedCases.filter(matches);

  const renderCaseRow = (z: any) => {
    const isOpen = z.status?.toLowerCase() === 'open';
    return (
      <a
        className="table-row zaak-row"
        href={`#/zaken/${z.uuid}`}
        key={z.uuid || z.naam}
        onClick={(e) => {
          e.preventDefault();
          onCaseClick(z.uuid);
        }}
      >
        <span>
          <span className="zaak-link">{z.naam}</span>
        </span>
        <span>{z.datumAanvraag || z.datum}</span>
        <span>
          <span className={`status-badge ${isOpen ? 'status-badge--open' : 'status-badge--closed'}`}>
            {z.status}
          </span>
        </span>
      </a>
    );
  };

  return (
    <>
      <h1>Mijn zaken</h1>
      <p className="page-sub">Volg de status en geschiedenis van uw lopende en gesloten aanvragen.</p>

      <Tabs.Root defaultValue="open" className="tabs">
        <Tabs.List className="tabs__list">
          <Tabs.Trigger value="open">
            Lopende zaken <TabCount>{openCases.length}</TabCount>
          </Tabs.Trigger>
          <Tabs.Trigger value="gesloten">
            Gesloten <TabCount>{closedCases.length}</TabCount>
          </Tabs.Trigger>
          <Tabs.Indicator className="tabs__indicator" />
        </Tabs.List>

        <Tabs.Content value="open">
          <div className="zaken-toolbar">
            <input 
              type="search" 
              placeholder="Zoek in zaken…" 
              aria-label="Zoek in zaken" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="button-primary" type="button">
              Zoeken
            </button>
          </div>

          <div className="panel zaken">
            {openFiltered.length ? (
              openFiltered.map(renderCaseRow)
            ) : (
              <p className="panel-empty">Geen lopende zaken gevonden.</p>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="gesloten">
          <div className="zaken-toolbar">
            <input 
              type="search" 
              placeholder="Zoek in zaken…" 
              aria-label="Zoek in zaken" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="button-primary" type="button">
              Zoeken
            </button>
          </div>

          <div className="panel zaken">
            {closedFiltered.length ? (
              closedFiltered.map(renderCaseRow)
            ) : (
              <p className="panel-empty">Geen gesloten zaken gevonden.</p>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}

function ZaakDetailPage({ selectedCase, go }: { selectedCase: any; go: (p: PageKey) => void }) {
  if (!selectedCase) return <p>Geen zaak geselecteerd.</p>;

  return (
    <>
      <a className="back-link" href="#/zaken" onClick={navLink(go, 'zaken')}>
        <Icon id="icon-arrow" /> Terug naar overzicht
      </a>
      
      <h1>{selectedCase.naam}</h1>

      {selectedCase.openstaandeTaak && (
        <div className="alert--warning zaak-alert" role="note">
          <div>
            <strong className="zaak-alert__title">
              {selectedCase.openstaandeTaak.titel}
            </strong>
            <span className="zaak-alert__deadline">
              ⚠ {selectedCase.openstaandeTaak.deadlineText}
            </span>
          </div>
          <a className="button-primary" href={selectedCase.openstaandeTaak.actieUrl}>
            Informatie geven
          </a>
        </div>
      )}

      {/* Status Timeline */}
      <section className="section">
        <h2>Statusverloop</h2>
        <ol className="status-timeline">
          {selectedCase.statushistorie?.map((step: any) => {
            const isCompleted = step.status === 'voltooid';
            const isCurrent = step.status === 'lopend';
            const stepClass = isCompleted
              ? 'status-step status-step--done'
              : isCurrent
                ? 'status-step status-step--current'
                : 'status-step';

            return (
              <li key={step.nummer} className={stepClass}>
                <span className="status-step__line" aria-hidden="true" />
                <span className="status-step__marker">{isCompleted ? '✓' : step.nummer}</span>
                <div className="status-step__body">
                  <strong className="status-step__title">{step.titel}</strong>
                  {step.toelichting?.map((desc: string, dIdx: number) => (
                    <p key={dIdx} className="status-step__desc">{desc}</p>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Case Details */}
      <section className="section">
        <h2>Details</h2>
        <dl className="datalist">
          <dt>Datum aanvraag</dt>
          <dd>{new Date(selectedCase.datumAanvraag).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
          <dt>Zaaknummer</dt>
          <dd className="dd-mono">{selectedCase.zaaknummer}</dd>
          <dt>Status</dt>
          <dd>{selectedCase.status}</dd>
        </dl>
      </section>

      {/* Case Documents */}
      <section className="section">
        <h2>Documenten</h2>
        <div className="panel zaak-rows">
          {selectedCase.documenten?.map((doc: any, idx: number) => (
            <div key={idx} className="zaak-doc">
              <div className="zaak-doc__name">
                <Icon id="icon-clipboard" />
                <span>{doc.naam}</span>
                <span className="zaak-doc__type">({doc.type.toUpperCase()}, {doc.grootte})</span>
              </div>
              <span>{new Date(doc.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="zaak-doc__bron">{doc.bron}</span>
              <a className="zaak-doc__download" href="#" onClick={(e) => e.preventDefault()}>
                Download
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Timeline */}
      <section className="section">
        <h2>Eerdere contactmomenten</h2>
        <div className="panel zaak-rows">
          {selectedCase.contactmomenten?.map((contact: any, idx: number) => (
            <div key={idx} className="zaak-contact">
              <span className="zaak-contact__date">
                {new Date(contact.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span>
                <span className="zaak-contact__channel">{contact.kanaal}</span>
              </span>
              <span>{contact.tekst}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function GegevensPage() {
  return (
    <>
      <h1>Mijn gegevens</h1>
      <nav className="anchor-nav" aria-label="Onderdelen op deze pagina">
        <a href="#contactgegevens">Contactgegevens</a>
        <a href="#persoonsgegevens">Persoonsgegevens</a>
        <a href="#adresgegevens">Adresgegevens</a>
        <a href="#meldingen">Meldingen</a>
      </nav>

      <div className="datasection" id="contactgegevens">
        <div className="datasection__head">
          <h2>Contactgegevens</h2>
          <a href="#">Wijzigen</a>
        </div>
        <dl className="datalist">
          <dt>E-mailadres</dt>
          <dd>jeroen@example.test</dd>
          <dt>Telefoonnummer</dt>
          <dd>06 12345678</dd>
        </dl>
      </div>

      <div className="datasection" id="persoonsgegevens">
        <div className="datasection__head">
          <h2>Persoonsgegevens</h2>
          <a href="#">Wijzigen</a>
        </div>
        <dl className="datalist">
          <dt>Naam</dt>
          <dd>Jeroen van Drouwen</dd>
          <dt>Geboortedatum</dt>
          <dd>14 maart 1981</dd>
          <dt>Burgerservicenummer</dt>
          <dd>••••••782</dd>
        </dl>
        <h3 style={{ marginTop: 20 }}>Zie ook</h3>
        <ul>
          <li>
            <a href="#">Bekijk hoe de gemeente met persoonsgegevens omgaat</a>
          </li>
        </ul>
      </div>

      <div className="datasection" id="adresgegevens">
        <div className="datasection__head">
          <h2>Adresgegevens</h2>
          <a href="#">Wijzigen</a>
        </div>
        <dl className="datalist">
          <dt>Woonadres</dt>
          <dd>Keukenlaan 133, 1234 AB Voorbeeld</dd>
          <dt>Postadres</dt>
          <dd>Gelijk aan woonadres</dd>
        </dl>
      </div>

      <div className="datasection" id="meldingen">
        <div className="datasection__head">
          <h2>Meldingen</h2>
          <a href="#">Wijzigen</a>
        </div>
        <dl className="datalist">
          <dt>E-mail over nieuwe berichten</dt>
          <dd>Aan</dd>
          <dt>Sms over afspraken</dt>
          <dd>Uit</dd>
          <dt>Herinneringen voor taken</dt>
          <dd>Aan</dd>
        </dl>
      </div>
    </>
  );
}

function BriefPage({ go, selectedTask }: { go: (p: PageKey) => void; selectedTask: any }) {
  const task = selectedTask || {
    titel: 'Contactpersoon doorgeven aan de Belastingdienst',
    org: 'Belastingdienst',
    deadline: 'vóór 2 juli 2026',
    raw: {
      uuid: 'bd-ervenbrief',
      context: {
        urn: 'urn:nl:belastingdienst:dossier:123456',
        canonicalUrl: '#'
      },
      uitvoering: {
        canonicalUrl: 'https://www.belastingdienst.nl',
        type: 'formulier'
      }
    }
  };

  const title = task.titel;
  const orgName = task.org;
  const deadlineText = task.deadline || 'Geen deadline';

  const briefMetaList = [
    ['Afzender', orgName],
    ['Soort brief', task.raw?.uitvoering?.type || 'Actiebrief'],
    ['Ontvangen', '1 juni 2026'],
    ['Gericht aan', 'De erven van de overledene'],
    ['Uiterlijk reageren', deadlineText],
    ['Kenmerk', task.raw?.uuid || 'BD.ERVENBRIEF'],
  ];

  return (
    <>
      <a className="back-link" href="#/taken" onClick={navLink(go, 'taken')}>
        <Icon id="icon-arrow" /> Terug naar taken
      </a>
      <h1>{title}</h1>
      <p className="brief-sub">Brief van {orgName} · {deadlineText}</p>

      {task.ai && (
        <div className="alert--warning" role="note">
          <span className="alert__icon" aria-hidden="true">
            ⚠
          </span>
          <div>
            Deze brief is automatisch verwerkt door AI. Controleer de gegevens voordat u deze verstuurt.
          </div>
        </div>
      )}

      <section className="section" style={{ marginTop: 0 }}>
        <h2>Wat wordt er gevraagd?</h2>
        <p>{task.raw?.toelichting?.nl || task.titel}</p>
        {task.raw?.uitvoering?.canonicalUrl && (
          <a className="button-primary" href={task.raw.uitvoering.canonicalUrl} target="_blank" rel="noopener noreferrer">
            Regel dit bij {orgName}
          </a>
        )}
      </section>

      <section className="section">
        <h2>Over deze brief</h2>
        <dl className="datalist" style={{ gridTemplateColumns: 'minmax(180px, 240px) 1fr' }}>
          {briefMetaList.map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt style={{ fontWeight: 700, color: 'var(--color-text)' }}>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

function LinkRow({ titel, meta, href = '#' }: { titel: string; meta?: string; href?: string }) {
  return (
    <a className="task" href={href}>
      <span className="task__title">{titel}</span>
      <span className="task__deadline">{meta ?? ''}</span>
      <span className="task__arrow">
        <Icon id="icon-arrow" />
      </span>
    </a>
  );
}

function ItemsTable({ head, rows }: { head: [string, string, string]; rows: [string, string, string][] }) {
  return (
    <div className="panel zaken">
      <div className="table-row table-head">
        {head.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {rows.map((r) => (
        <div className="table-row" key={r.join('-')}>
          <span>{r[0]}</span>
          <span>{r[1]}</span>
          <span>{r[2]}</span>
        </div>
      ))}
    </div>
  );
}

function ThemePage({ data }: { data: ThemeData }) {
  return (
    <>
      <h1>{data.title}</h1>
      <section className="section">
        <h2>Wat moet ik regelen</h2>
        {data.tasks.length ? (
          <div className="panel taken-panel">
            {data.tasks.map(([t, due]) => (
              <LinkRow key={t} titel={t} meta={due} href="#/taken" />
            ))}
          </div>
        ) : (
          <p className="intro">Er zijn geen openstaande taken.</p>
        )}
      </section>
      <section className="section">
        <h2>Wat kan ik regelen</h2>
        <div className="panel taken-panel">
          {data.actions.map((a) => (
            <LinkRow key={a} titel={a} />
          ))}
        </div>
      </section>
      <section className="section">
        <h2>{data.itemsTitle}</h2>
        <ItemsTable head={data.itemsHead} rows={data.items} />
      </section>
    </>
  );
}

function ProductenPage({ producten }: { producten: any[] }) {
  return (
    <>
      <h1>Mijn producten</h1>
      <p className="page-sub">Producten en vergunningen die u van de overheid heeft gekregen.</p>
      <div className="panel berichten">
        {producten.map((p) => (
          <a className="table-row" href="#" key={p.titel}>
            <span>
              <span className="bericht__subject" style={{ marginTop: 0 }}>
                {p.titel}
              </span>
              <span className="bericht__org">{p.sub}</span>
            </span>
            <span className="task__deadline">{p.groep}</span>
          </a>
        ))}
      </div>
    </>
  );
}

function BelastingzakenPage() {
  return (
    <>
      <h1>Belastingzaken</h1>
      <section className="section">
        <h2>Mijn taken</h2>
        <div className="panel taken-panel">
          {taxTasks.map(([t, due]) => (
            <LinkRow key={t} titel={t} meta={due} href="#/taken" />
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Wat kan ik regelen</h2>
        <div className="panel taken-panel">
          {taxActions.map((a) => (
            <LinkRow key={a} titel={a} />
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Aanslagen</h2>
        <ItemsTable
          head={['Aanslag', 'Jaar', 'Bedrag']}
          rows={[
            ['Gemeentelijke belastingen', '2026', '€ 6.982,30'],
            ['Rioolrecht grootafvoer', '2026', '€ 211,30'],
            ['Afvalstoffenheffing', '2026', '€ 348,00'],
            ['WOZ-beschikking', '2026', '€ 438.000'],
          ]}
        />
      </section>
    </>
  );
}

function AgendaPage({ afspraken }: { afspraken: any[] }) {
  return (
    <>
      <h1>Mijn agenda</h1>
      <p className="page-sub">Afspraken met de gemeente op één plek.</p>
      <section className="section" style={{ marginTop: 8 }}>
        <h2>Afspraken</h2>
        <div className="panel">
          {afspraken.map((a) => (
            <div className="table-row" key={a.titel} style={{ gridTemplateColumns: '1fr auto' }}>
              <span className="task__main">
                <span className="task__title" style={{ color: 'var(--color-text)' }}>
                  {a.titel}
                </span>
                <span className="task__org">{a.wanneer}</span>
              </span>
              <a href="#">{a.actie} →</a>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function PlanPage() {
  return (
    <>
      <h1>Mijn plan</h1>
      <p className="page-sub">Overzicht van doelen, taken, afspraken en contactpersonen.</p>
      <section className="section" style={{ marginTop: 8 }}>
        <h2>Mijn doelen</h2>
        <div className="cards">
          {planDoelen.map((d) => (
            <div className="card" key={d.titel} style={{ cursor: 'default' }}>
              <span className="card__title">{d.titel}</span>
              <span className="card__id">{d.meta}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Contactpersonen</h2>
        <dl className="datalist">
          <dt>Consulent</dt>
          <dd>R. de Vries</dd>
          <dt>Telefoon</dt>
          <dd>14 000</dd>
        </dl>
      </section>
    </>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <>
      <h1>{title}</h1>
      <p className="intro">Deze pagina is in deze demo nog niet uitgewerkt. De navigatie en huisstijl werken al.</p>
    </>
  );
}

function Faq() {
  return (
    <section className="faq">
      <h2>Veelgestelde vragen</h2>
      <Accordion.Root collapsible className="faq-list">
        {faqs.map((f) => (
          <Accordion.Item key={f.q} value={f.q}>
            <Accordion.ItemTrigger>
              <Accordion.ItemIndicator>›</Accordion.ItemIndicator>
              {f.q}
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>{f.a}</Accordion.ItemContent>
          </Accordion.Item>
        ))}
      </Accordion.Root>
      <a className="faq-all" href="#">
        Bekijk alle veelgestelde vragen <Icon id="icon-arrow" />
      </a>
    </section>
  );
}

function Footer({ brand }: { brand: Brand }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <a className="site-footer__brand" href="#/home">
          {brand.mark ? (
            <img className="site-footer__mark" src={brand.mark} alt="" aria-hidden="true" />
          ) : brand.lint ? (
            <img src={brand.lint} alt="" aria-hidden="true" />
          ) : null}
          {brand.name}
        </a>
        <section>
          <h2>Contact</h2>
          <p>
            Bel <a href="tel:1400" style={{ display: 'inline' }}>1400</a> maandag tot en met vrijdag van 8.00 tot 20.00
            of stel uw vraag via <a href="mailto:vragen@mijn.overheid.nl" style={{ display: 'inline' }}>vragen@mijn.overheid.nl</a>
          </p>
        </section>
        <nav aria-label="Footer">
          <a href="#">Over MijnOverheid</a>
          <a href="#">Nieuwsbrief</a>
          <a href="#">Toegankelijkheid</a>
          <a href="#">Werken bij de overheid</a>
        </nav>
        <nav aria-label="Juridisch">
          <a href="#">Bescherming persoonsgegevens</a>
          <a href="#">Gebruikersvoorwaarden</a>
          <a href="#">Proclaimer</a>
          <a href="#">Toegankelijkheidsverklaring</a>
        </nav>
      </div>
    </footer>
  );
}

export function App() {
  const [theme, setTheme] = useState('rijk');
  const [page, go] = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);

  // Voorkom scrollen van de achtergrond zolang het fullscreen-menu open is.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Sluit het menu bij navigeren naar een andere pagina.
  useEffect(() => {
    setMenuOpen(false);
  }, [page]);

  const [tasksOpen, setTasksOpen] = useState<Taak[]>(takenOpenDefault);
  const [tasksDone, setTasksDone] = useState<Taak[]>(takenDoneDefault);
  const [products, setProducts] = useState<any[]>(productenDefault);
  const [appointments, setAppointments] = useState<any[]>(afsprakenDefault);
  const [conversations, setConversations] = useState<any[]>(berichtenDefault);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const [cases, setCases] = useState<any[]>(zakenLijst);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [showInspector, setShowInspector] = useState(false);
  const [showEndpoints, setShowEndpoints] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(0);
  // Per-API endpoint-overrides: applied (apiBases) + bewerkbare concepten (drafts).
  const [apiBases, setApiBases] = useState<Record<string, string>>(readStoredApiBases);
  const [apiBaseDrafts, setApiBaseDrafts] = useState<Record<string, string>>(readStoredApiBases);
  const [customMethod, setCustomMethod] = useState(customRequestDefaults.method);
  const [customPath, setCustomPath] = useState(customRequestDefaults.path);
  const [customBody, setCustomBody] = useState(customRequestDefaults.body);
  const [customSending, setCustomSending] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  function applyTheme(value: string) {
    setTheme(value);
    document.documentElement.dataset.theme = value;
  }

  const trackedFetch = useCallback(async (url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';
    const id = Math.random().toString(36).substring(7);
    const shortUrl = formatLogUrl(url, getDefaultApiBase());
    const newLog = {
      id,
      url: shortUrl,
      fullUrl: url,
      method,
      timestamp: new Date().toLocaleTimeString(),
      pending: true,
      status: undefined,
      statusText: undefined,
    };
    // Nieuwste bovenaan, zodat een verstuurd verzoek direct zichtbaar is.
    setApiLogs(prev => [newLog, ...prev]);
    try {
      const res = await fetch(url, options);
      setApiLogs(prev => prev.map(item => item.id === id ? { ...item, pending: false, status: res.status, statusText: res.statusText } : item));
      return res;
    } catch (err: any) {
      setApiLogs(prev => prev.map(item => item.id === id ? { ...item, pending: false, statusText: err.message || 'Error' } : item));
      throw err;
    }
  }, []);

  // Bouwt de volledige URL voor een call. Heeft de API een eigen endpoint, dan
  // vervangt dat het standaarddeel t/m de versie (…/apis/rest/{api}/{versie});
  // anders wordt het standaard-endpoint gebruikt.
  const buildUrl = useCallback(
    (pathOrUrl: string) => {
      const trimmed = pathOrUrl.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      const override = normalizeApiBase(apiBases[apiFromPath(path)] || '');
      if (override) {
        const prefix = path.match(/^\/apis\/rest\/[^/]+\/[^/]+/)?.[0] ?? '';
        return `${override}${path.slice(prefix.length)}`;
      }
      return `${getDefaultApiBase()}${path}`;
    },
    [apiBases],
  );

  function applyApiBases() {
    const next: Record<string, string> = {};
    for (const { key } of apiEndpoints) {
      const normalized = normalizeApiBase(apiBaseDrafts[key] || '');
      if (normalized) next[key] = normalized;
    }
    setApiBases(next);
    setApiBaseDrafts(next);
    localStorage.setItem(API_BASES_STORAGE_KEY, JSON.stringify(next));
  }

  async function sendCustomRequest() {
    setCustomError(null);
    const url = buildUrl(customPath);
    const options: RequestInit = {
      method: customMethod,
      headers: { ...defaultMockHeaders },
    };

    if (customMethod !== 'GET' && customMethod !== 'DELETE') {
      if (!customBody.trim()) {
        setCustomError('Body is verplicht voor dit verzoek.');
        return;
      }
      try {
        JSON.parse(customBody);
      } catch {
        setCustomError('Ongeldige JSON in body.');
        return;
      }
      options.body = customBody;
    }

    setCustomSending(true);
    try {
      await trackedFetch(url, options);
    } catch {
      // Fout staat al in het log-overzicht.
    } finally {
      setCustomSending(false);
    }
  }


  useEffect(() => {
    const fetchAllData = async () => {
      const headers = { ...defaultMockHeaders };
      
      try {
        // 1. Fetch Taken from taken/next mock
        const takenRes = await trackedFetch(buildUrl(`/apis/rest/taken/next/context/zoek`), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            klantId: 'a8f3c1d2-7e44-4b1a-9c0f-123456789abc',
            include: ['taken']
          })
        });
        
        if (takenRes.ok) {
          const data = await takenRes.json();
          const mappedTaken = (data.taken || []).map((t: any) => {
            const org = getOrgName(t);
            const formattedDate = formatDeadline(t.deadline);
            const isActionable = t.actieNodig !== false && t.status !== 'ter-info';
            const isAi = t.uitvoering?.type === 'formulier' || (t.labels && t.labels.includes('ingevuld'));
            return {
              titel: t.titel?.nl || t.titel?.en || 'Taak',
              org,
              deadline: formattedDate,
              ai: isAi,
              terInfo: !isActionable,
              automatisch: t.automatisch || false,
              cat: isActionable
                ? (isAi ? 'ingevuld' : 'belangrijkste')
                : 'geenactie',
              raw: t,
            };
          });
          setTasksOpen(mappedTaken.filter((t: Taak) => t.cat !== 'geenactie'));
          setTasksDone(mappedTaken.filter((t: Taak) => t.cat === 'geenactie'));
        }
        
        // 2. Fetch Producten from producten/next mock
        const prodRes = await trackedFetch(buildUrl(`/apis/rest/producten/next/producten/zoek`), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            klantId: 'a8f3c1d2-7e44-4b1a-9c0f-123456789abc'
          })
        });
        
        if (prodRes.ok) {
          const data = await prodRes.json();
          const mappedProds = (data || []).map((p: any) => ({
            titel: p.naam,
            sub: p.producttype?.naam || p.producttype?.code || 'Product',
            groep: p.status || 'actief',
            raw: p
          }));
          if (mappedProds.length > 0) {
            setProducts(mappedProds);
          }
        }
        
        // 3. Fetch Agenda from agenda/next mock
        const agendaRes = await trackedFetch(buildUrl(`/apis/rest/agenda/next/afspraken/opvragen`), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            identificaties: [
              {
                type: 'email',
                waarde: 'jeroen@example.test'
              }
            ]
          })
        });
        
        if (agendaRes.ok) {
          const data = await agendaRes.json();
          const mappedAgenda = (data.afspraken || []).map((a: any) => ({
            titel: a.onderwerp,
            wanneer: formatAfspraakWhen(a.geplandAanvangsmoment, a.geplandEindmoment),
            actie: 'Zet in eigen agenda',
            raw: a
          }));
          if (mappedAgenda.length > 0) {
            setAppointments(mappedAgenda);
          }
        }
        
        // 4. Fetch Gesprekken from gesprekken/next mock
        const gespRes = await trackedFetch(buildUrl(`/apis/rest/gesprekken/next/gesprekken`), {
          method: 'GET',
          headers
        });
        
        if (gespRes.ok) {
          const data = await gespRes.json();
          const mappedGesp = (data.results || []).map((g: any, idx: number) => ({
            org: 'Gemeente',
            titel: g.gespreksonderwerp,
            datum: formatConversationDate(g.aanvangsmomentGesprek),
            ongelezen: idx === 0,
            raw: g
          }));
          if (mappedGesp.length > 0) {
            setConversations(mappedGesp);
          }
        }

        // 5. Fetch Zaken from zaken/next mock
        const zakenRes = await trackedFetch(buildUrl(`/apis/rest/zaken/next/zaken/zoek`), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            klantId: 'a8f3c1d2-7e44-4b1a-9c0f-123456789abc'
          })
        });
        
        if (zakenRes.ok) {
          const data = await zakenRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setCases(data);
          }
        }
        
      } catch (err) {
        console.error('Fout bij het laden van mock data:', err);
      }
    };
    
    fetchAllData();
  }, [buildUrl, trackedFetch]);

  const handleTaakClick = (t: Taak) => {
    setSelectedTask(t);
    go('brief');
  };

  const handleCaseClick = async (uuid: string) => {
    try {
      const res = await trackedFetch(buildUrl(`/apis/rest/zaken/next/zaken/${uuid}`), {
        headers: defaultMockHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCase(data);
        go('zaak-detail');
      }
    } catch (err) {
      console.error('Fout bij ophalen zaak detail:', err);
    }
  };

  // Esc sluit de zoek-overlay.
  useEffect(() => {
    if (!searchOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const openSearch = () => {
    setMenuOpen(false);
    setSearchOpen(true);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };
  const runSearchResult = (run: () => void) => {
    run();
    closeSearch();
  };

  // App-brede zoekindex over alle geladen data (één bron: de App-state).
  const searchQ = searchQuery.trim().toLowerCase();
  const searchResults = searchQ
    ? [
        ...[...tasksOpen, ...tasksDone].map((t) => ({
          group: 'Taken',
          title: t.titel,
          sub: t.org,
          run: () => handleTaakClick(t),
        })),
        ...cases.map((z) => ({
          group: 'Zaken',
          title: z.naam,
          sub: z.zaaknummer || z.status || '',
          run: () => (z.uuid ? handleCaseClick(z.uuid) : go('zaken')),
        })),
        ...conversations.map((c) => ({
          group: 'Berichten',
          title: c.titel,
          sub: c.org,
          run: () => go('berichten'),
        })),
        ...products.map((p) => ({
          group: 'Producten',
          title: p.titel,
          sub: p.sub,
          run: () => go('producten'),
        })),
        ...appointments.map((a) => ({
          group: 'Afspraken',
          title: a.titel,
          sub: a.wanneer,
          run: () => go('agenda'),
        })),
      ].filter((r) => `${r.title} ${r.sub ?? ''} ${r.group}`.toLowerCase().includes(searchQ))
    : [];

  const built = [
    'home',
    'dossier',
    'taken',
    'berichten',
    'zaken',
    'gegevens',
    'brief',
    'zaak-detail',
    'producten',
    'belastingzaken',
    'agenda',
    'plan',
    ...Object.keys(themeData),
  ];

  const brand = brands[theme] ?? brands.rijk;

  return (
    <>
      <header className="masthead">
        {brand.lint && (
          <span className="masthead__lint" aria-hidden="true">
            <img src={brand.lint} alt="" />
          </span>
        )}
        <div className="masthead__inner">
          <button
            type="button"
            className="masthead__menu-btn"
            aria-label="Menu openen"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <span className="masthead__menu-bars" aria-hidden="true" />
            Menu
          </button>
          <a className="masthead__brand" href="#/home" onClick={navLink(go, 'home')}>
            {brand.mark && <img className="masthead__mark" src={brand.mark} alt="" />}
            {brand.name}
          </a>
          <div className="masthead__links">
            <button type="button" className="masthead__search" onClick={openSearch}>
              <Icon id="icon-search" />
              <span>Zoeken</span>
            </button>
            <a className="masthead__user" href="#/gegevens" onClick={navLink(go, 'gegevens')}>
              <Icon id="icon-user" />
              Jeroen van Drouwen
            </a>
            <a href="/">Uitloggen</a>
          </div>
        </div>
      </header>
      <div className="accent-line" />

      <nav className="breadcrumb" aria-label="Kruimelpad">
        <a href="#/home" onClick={navLink(go, 'home')}>
          Home
        </a>
        {page !== 'home' && (
          <>
            {' › '}
            <span aria-current="page">{labels[page]}</span>
          </>
        )}
      </nav>

      <div className="layout">
        <aside
          id="mobile-menu"
          className={`sidenav${menuOpen ? ' is-open' : ''}`}
          aria-label="Mijn omgeving"
        >
          <div className="sidenav__mobile-head">
            <span className="sidenav__mobile-title">Menu</span>
            <button
              type="button"
              className="sidenav__close"
              onClick={() => setMenuOpen(false)}
              aria-label="Menu sluiten"
            >
              &times;
            </button>
          </div>
          <button type="button" className="sidenav__search" onClick={openSearch}>
            <Icon id="icon-search" />
            <span>Zoeken</span>
          </button>
          <ul>
            {nav.map((n) => {
              let badgeCount = n.badge;
              if (n.key === 'taken') {
                badgeCount = tasksOpen.filter(t => t.cat === 'belangrijkste' || t.cat === 'ingevuld').length;
              } else if (n.key === 'berichten') {
                badgeCount = conversations.filter(c => c.ongelezen).length;
              } else if (n.key === 'zaken') {
                badgeCount = cases.filter(c => c.status === 'Open' || c.status?.toLowerCase() === 'open').length;
              } else if (n.key === 'agenda') {
                badgeCount = appointments.length;
              }
              return (
                <li key={n.key}>
                  <a
                    href={`#/${n.key}`}
                    aria-current={page === n.key ? 'page' : undefined}
                    className={page === n.key ? 'is-current' : ''}
                    onClick={(e) => {
                      e.preventDefault();
                      go(n.key);
                      setMenuOpen(false);
                    }}
                  >
                    <Icon id={n.icon} />
                    <span>{n.label}</span>
                    {!!badgeCount && <span className="sidenav__badge">{badgeCount}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="sidenav__mobile-foot">
            <a
              className="sidenav__user"
              href="#/gegevens"
              onClick={(e) => {
                e.preventDefault();
                go('gegevens');
                setMenuOpen(false);
              }}
            >
              <Icon id="icon-user" />
              <span>Jeroen van Drouwen</span>
            </a>
            <a href="/">Uitloggen</a>
          </div>
        </aside>

        <main className="shell" id="main">
          {page === 'home' && <HomePage go={go} takenOpen={tasksOpen} onTaakClick={handleTaakClick} />}
          {page === 'dossier' && <DossierPage takenOpen={tasksOpen} takenDone={tasksDone} onTaakClick={handleTaakClick} />}
          {page === 'taken' && <TakenPage takenOpen={tasksOpen} takenDone={tasksDone} onTaakClick={handleTaakClick} />}
          {page === 'berichten' && <BerichtenPage go={go} berichten={conversations} />}
          {page === 'zaken' && <ZakenPage cases={cases} onCaseClick={handleCaseClick} />}
          {page === 'zaak-detail' && <ZaakDetailPage selectedCase={selectedCase} go={go} />}
          {page === 'gegevens' && <GegevensPage />}
          {page === 'brief' && <BriefPage go={go} selectedTask={selectedTask} />}
          {page === 'producten' && <ProductenPage producten={products} />}
          {page === 'belastingzaken' && <BelastingzakenPage />}
          {page === 'agenda' && <AgendaPage afspraken={appointments} />}
          {page === 'plan' && <PlanPage />}
          {page in themeData && <ThemePage data={themeData[page]} />}
          {!built.includes(page) && <Placeholder title={labels[page]} />}

          <Faq />
        </main>
      </div>

      <Footer brand={brand} />

      {searchOpen && (
        <div className="search-overlay" onClick={closeSearch}>
          <div
            className="search-box"
            role="dialog"
            aria-label="Zoeken"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="search-box__head">
              <Icon id="icon-search" />
              <input
                className="search-box__input"
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSearchActive((i) => Math.min(i + 1, searchResults.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSearchActive((i) => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter') {
                    const r = searchResults[searchActive];
                    if (r) runSearchResult(r.run);
                  }
                }}
                placeholder="Zoek in taken, zaken, berichten, producten…"
                aria-label="Zoekterm"
              />
              <button
                type="button"
                className="search-box__close"
                onClick={closeSearch}
                aria-label="Sluiten"
              >
                &times;
              </button>
            </div>
            <div className="search-box__results">
              {searchQ === '' ? (
                <p className="search-box__hint">
                  Typ om te zoeken in al uw taken, zaken, berichten, producten en afspraken.
                </p>
              ) : searchResults.length === 0 ? (
                <p className="search-box__hint">Geen resultaten voor “{searchQuery}”.</p>
              ) : (
                searchResults.map((r, i) => (
                  <button
                    type="button"
                    className={`search-result${i === searchActive ? ' is-active' : ''}`}
                    key={`${r.group}-${r.title}-${i}`}
                    aria-selected={i === searchActive}
                    ref={(el) => {
                      if (i === searchActive && el) el.scrollIntoView({ block: 'nearest' });
                    }}
                    onMouseEnter={() => setSearchActive(i)}
                    onClick={() => runSearchResult(r.run)}
                  >
                    <span className="search-result__main">
                      <span className="search-result__title">{r.title}</span>
                      {r.sub && <span className="search-result__sub">{r.sub}</span>}
                    </span>
                    <span className="search-result__group">{r.group}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="demo-toolbar">
        {showInspector && (
          <div className="api-inspector">
            <div className="api-inspector__header">
              <h4 className="api-inspector__title">
                <span className="api-inspector__title-icon" aria-hidden="true">⚡</span>
                API Inspector
              </h4>
              <div className="api-inspector__actions">
                <button
                  type="button"
                  className={`api-inspector__icon-btn${showEndpoints ? ' is-active' : ''}`}
                  onClick={() => setShowEndpoints((v) => !v)}
                  aria-label="Endpoints instellen"
                  aria-pressed={showEndpoints}
                  title="Endpoint per API instellen"
                >
                  <Icon id="icon-settings" />
                </button>
                <button
                  type="button"
                  className="api-inspector__action"
                  onClick={() => setApiLogs([])}
                >
                  Wissen
                </button>
                <button
                  type="button"
                  className="api-inspector__close"
                  onClick={() => setShowInspector(false)}
                  aria-label="Sluiten"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="api-inspector__panel">
              {showEndpoints && (
                <div className="api-inspector__section">
                  <span className="api-inspector__label">Endpoint per API</span>
                  <div className="api-inspector__endpoints">
                    {apiEndpoints.map(({ key, label }) => (
                      <div className="api-inspector__endpoint" key={key}>
                        <span className="api-inspector__endpoint-name">{label}</span>
                        <input
                          className="api-inspector__input"
                          type="url"
                          value={apiBaseDrafts[key] || ''}
                          onChange={(e) =>
                            setApiBaseDrafts((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={defaultApiEndpoint(key)}
                          aria-label={`Endpoint voor ${label}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="api-inspector__row">
                    <button type="button" className="api-inspector__button" onClick={applyApiBases}>
                      Toepassen
                    </button>
                  </div>
                  <p className="api-inspector__hint">
                    Laat leeg voor het standaard-endpoint. Een eigen endpoint geldt alleen voor
                    die API.
                  </p>
                </div>
              )}

              <div className="api-inspector__section">
                <span className="api-inspector__label">Handmatig verzoek</span>
                <div className="api-inspector__row api-inspector__row--method">
                  <select
                    className="api-inspector__select"
                    value={customMethod}
                    onChange={(e) => setCustomMethod(e.target.value)}
                    aria-label="HTTP-methode"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PATCH">PATCH</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <input
                    className="api-inspector__input"
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="/apis/rest/taken/next/context/zoek"
                    aria-label="Pad of URL"
                  />
                </div>
                {customMethod !== 'GET' && customMethod !== 'DELETE' && (
                  <textarea
                    className="api-inspector__textarea"
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    rows={5}
                    spellCheck={false}
                    aria-label="Request body (JSON)"
                  />
                )}
                {customError && <p className="api-inspector__error">{customError}</p>}
                <button
                  type="button"
                  className="api-inspector__button api-inspector__button--primary"
                  onClick={sendCustomRequest}
                  disabled={customSending}
                >
                  {customSending ? 'Versturen…' : 'Versturen'}
                </button>
              </div>

              <div className="api-inspector__section">
                <span className="api-inspector__label">Verzoeken</span>
            <div className="api-inspector__list">
              {apiLogs.length === 0 ? (
                <div className="api-inspector__empty">
                  Geen API verzoeken geregistreerd.
                </div>
              ) : (
                apiLogs.map((log) => {
                  const isSuccess = log.status && log.status >= 200 && log.status < 300;
                  const isError = log.status && log.status >= 400;
                  const statusClass = log.pending
                    ? 'api-inspector__status--pending'
                    : isSuccess
                      ? 'api-inspector__status--success'
                      : isError
                        ? 'api-inspector__status--error'
                        : 'api-inspector__status--pending';

                  const docsUrl = docsUrlForCall(log.method, log.fullUrl || log.url);

                  return (
                    <div key={log.id} className="api-inspector__item">
                      <div className="api-inspector__item-head">
                        <span
                          className={`api-inspector__method api-inspector__method--${log.method === 'POST' ? 'post' : log.method === 'GET' ? 'get' : 'other'}`}
                        >
                          {log.method}
                        </span>
                        <span className={`api-inspector__status ${statusClass}`}>
                          {log.pending ? 'Plaatsen...' : log.status || log.statusText}
                        </span>
                      </div>
                      <div className="api-inspector__url">{log.url}</div>
                      <div className="api-inspector__meta">
                        <span>{log.timestamp}</span>
                        {docsUrl && (
                          <a
                            className="api-inspector__docs-link"
                            href={docsUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open de API-documentatie voor deze call"
                          >
                            API-docs ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
              </div>
            </div>
            <div className="api-inspector__footer">
              Standaard: {getDefaultApiBase()}
            </div>
          </div>
        )}

        <div className="demo-toolbar__bar">
          <a
            href="/"
            className="demo-toolbar__brand"
            title="Terug naar API lab"
            aria-label="Terug naar API lab"
          >
            <img className="demo-toolbar__logo" src="vng-logo.svg" alt="VNG" width="96" height="50" />
          </a>
          <span className="demo-toolbar__divider" aria-hidden="true" />
          <a
            href="/"
            className="demo-toolbar__btn demo-toolbar__btn--back"
            title="Terug naar API lab"
            aria-label="Terug naar API lab"
          >
            <Icon id="icon-arrow-left" />
            <span className="demo-toolbar__btn-text">API lab</span>
          </a>
          <button
            type="button"
            className={`demo-toolbar__btn demo-toolbar__btn--api${showInspector ? ' is-open' : ''}`}
            onClick={() => setShowInspector(!showInspector)}
            title="API requests"
            aria-label="API requests"
            aria-expanded={showInspector}
          >
            &lt;/&gt;
            {apiLogs.length > 0 && (
              <span className="demo-toolbar__badge">{apiLogs.length}</span>
            )}
          </button>
          <button
            type="button"
            className="demo-toolbar__btn"
            onClick={() => {
              const items = themes.items;
              const currentIndex = items.findIndex((item) => item.value === theme);
              const nextIndex = (currentIndex + 1) % items.length;
              applyTheme(items[nextIndex].value);
            }}
            title="Volgende huisstijl"
            aria-label="Volgende huisstijl"
          >
            <Icon id="icon-palette" />
          </button>
        </div>
      </div>
    </>
  );
}
