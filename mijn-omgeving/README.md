# MijnOmgeving — NLDS-ARK (proof of concept)

Een MijnOmgeving-shell op **Ark UI** (framework-agnostische headless componenten op
Zag.js state-machines), gethematiseerd via een **lichtgewicht NLDS-token-contract**,
met een werkende **huisstijl-switcher**.

> **Het idee (NLDS-ARK):** headless componenten (gedrag + toegankelijkheid) +
> een dunne NLDS-conforme theming-laag = je eigen, gecontroleerde NLDS-implementatie
> die in het ecosysteem past, maar zonder de 6-vendor-federatie en versie-churn.

## Wat dit bewijst

- **Eén app, elke huisstijl.** De switcher (zelf een Ark UI `Select`) wisselt
  `data-theme` op `<html>`; alles re-theme't live.
- **Ecosysteem-interop.** Het thema "Gemeente Veenendaal" zet *alleen* officiële
  `--basis-*` NLDS-tokens (geen `--brand-*`) en stuurt tóch dezelfde componenten —
  via laag 2 van de fallback-keten in `contract.css`.
- **Herbruikbaar.** Ark UI draait dezelfde componentlogica in React/Vue/Solid/Svelte,
  dus een overheid die deze library overneemt zit niet aan jouw framework vast.

## Architectuur

```
src/styles/contract.css   De ~14 vars die componenten lezen (--color-*/--font-*).
                          Elke var: --brand-* → --basis-* → hardcoded default.
                          ENIGE plek die NLDS-namen kent → één plek om te fixen.
src/styles/themes.css     Huisstijlen per [data-theme]: rijk/utrecht/denhaag (--brand-*)
                          + veenendaal (officieel --basis-*, bewijst interop).
src/App.tsx               MijnOmgeving-shell: Ark UI Select (switcher) + Accordion (docs).
```

## Draaien

```sh
pnpm install
pnpm dev    # http://localhost:5180
```

(Node 24 aanbevolen; werkt ook op nieuwere.)

## Een huisstijl toevoegen (Route A — lichtgewicht)

Een gemeente hoeft géén NLDS-tooling, design-tokens-pipeline of componenten te leveren.
Het volstaat om een **handvol `--brand-*`-variabelen** te zetten onder een eigen
`[data-theme]`. De rest valt automatisch terug op de NLDS Basis-laag of op veilige
standaarden (zie `src/styles/contract.css`).

**Stap 1 — voeg een thema-blok toe** aan `src/styles/themes.css`:

```css
[data-theme='zwolle'] {
  /* Lettertypen (optioneel; weglaten = systeemfont) */
  --brand-font-body: 'Zwolle Sans', system-ui, sans-serif;
  --brand-font-heading: 'Zwolle Sans', system-ui, sans-serif;

  /* Primaire kleur: koppen, knoppen, actieve nav, links */
  --brand-primary: #0061a6;
  --brand-primary-dark: #00467a; /* donkerder voor hover/active */
  --brand-on-primary: #ffffff; /* tekst óp primair */
  --brand-secondary: #0061a6; /* linkkleur */

  /* "Pop"-kleur: alleen voor zeer belangrijke UI (notificatie-teller) */
  --brand-accent: #ffd200;
  --brand-on-accent: #1a1a1a; /* donkere tekst op geel! */

  /* Tinten & vormen */
  --brand-soft: #e3eef7; /* lichte vlakken: banner, actief, hover */
  --brand-footer: #00467a; /* footer-achtergrond */
  --brand-border-radius: 4px;
}
```

**Stap 2 — registreer 'm in de switcher** (in `src/App.tsx`):

```ts
const themes = createListCollection({
  items: [
    /* … */
    { label: 'Gemeente Zwolle', value: 'zwolle' },
  ],
});
// en optioneel een logo/naam in `brands`:
const brands = { /* … */ zwolle: { name: 'Gemeente Zwolle', mark: '/logos/zwolle.svg' } };
```

Dat is alles. Een ontbrekende variabele is geen probleem — die valt terug op het
officiële NLDS Basis-token (als de gemeente dat levert) of op de Rijkshuisstijl-default.

### Token-referentie (`--brand-*`)

| Variabele | Stuurt | Valt terug op (NLDS Basis → default) |
| --- | --- | --- |
| `--brand-font-body` | basistekst | `--basis-text-font-family-default` → system-ui |
| `--brand-font-heading` | koppen | `--basis-heading-font-family` → font-body |
| `--brand-primary` | knoppen, koppen, actieve nav | `--basis-color-action-1-bg-default` → `#154273` |
| `--brand-primary-dark` | hover/active van primair | `--basis-color-action-1-bg-hover` → `#0b3060` |
| `--brand-on-primary` | tekst op primair | `--basis-color-action-1-color-default` → `#fff` |
| `--brand-secondary` | links, rij-tekst | `--basis-color-action-2-bg-default` → `#154273` |
| `--brand-text` | hoofdtekst | `--basis-color-default-color-default` → `#3b3b3b` |
| `--brand-page` | paginakleur | `--basis-color-default-bg-default` → `#f3f3f3` |
| `--brand-border` | randen | `--basis-color-default-border-default` → `#b4b4b4` |
| `--brand-border-soft` | zachte scheidingslijnen | `--basis-color-default-border-subtle` → `#e0e0e0` |
| `--brand-muted` | gedempte tekst (organisatie, meta) | `--basis-color-default-color-subtle` → `#595959` |
| `--brand-soft` | lichte vlakken (banner/hover/actief) | `--basis-color-action-1-bg-subtle` → `#e5eff7` |
| `--brand-focus` / `--brand-focus-bg` | focus-outline | `--basis-focus-color` / `--basis-focus-background-color` |
| `--brand-border-radius` | hoekafronding | `--basis-border-radius-md` → `2px` |
| `--brand-accent` / `--brand-on-accent` | **pop**-kleur + tekst erop | *(eigen extensie)* → `#d74085` / `#fff` |
| `--brand-footer` | footer-achtergrond | *(eigen extensie)* → `#535353` |
| `--brand-panel` | verhoogd wit vlak (paneel) | *(eigen extensie — geen eenduidig NLDS-token)* → `#fff` |

> **Tip — leesbaarheid:** kies `--brand-on-primary` en `--brand-on-accent` zó dat ze
> voldoende contrast geven (WCAG AA). Bij een lichte pop-kleur (geel) hoort donkere tekst.

### Route B (officieel NLDS-thema) in het kort

Levert een gemeente een **gecompileerd NLDS-tokens-bestand** (JSON → Style Dictionary →
CSS dat `--basis-*` zet, bv. `@rijkshuisstijl-community/design-tokens`), dan laad je dat
en scope je het onder hetzelfde `[data-theme]`. De fallback-keten in `contract.css` pakt
de `--basis-*`-waarden dan automatisch op — zonder dat de gemeente `--brand-*` schrijft.

## Wat dit NOG niet is

Een proof, geen afgemaakte library. Nog te doen om er een echte NLDS-implementatie
van te maken: componenten als herbruikbaar pakket publiceren (wrappers + token-contract),
meer componenten dekken, een echte WCAG/EN 301 549-audit, en de MijnOmgeving-pagina's
op echte data/het MijnTaken-contract aansluiten.
