# Lettertypen

De lettertype-bestanden zitten **bewust niet in deze repo** (licentie), en
`public/fonts/` staat in `.gitignore`.

## Rijksoverheid Sans (Rijk-thema) — werkt out of the box

RO Sans wordt geladen via een **publieke CDN** (jsDelivr → `Pleio/rijkshuisstijl`),
geconfigureerd in `src/styles/contract.css`. Je hoeft hier dus niets voor te doen;
het Rijksoverheid-thema toont meteen RO Sans.

> De Rijksoverheid-fonts zijn voorbehouden aan officiële Rijksoverheids-
> communicatie. Dit is een prototype; verwijzen naar een publieke kopie ≠ eigen
> herdistributie, maar gebruik in productie vereist toestemming.

## TheSans (Den Haag-thema) — optioneel zelf toevoegen

Het Den Haag-thema gebruikt **TheSans** (LucasFonts). Dat is een **trial-font
zonder publieke bron**, dus niet meegeleverd. Zonder de bestanden valt het Den
Haag-thema netjes terug op het systeemfont.

Wil je TheSans tonen, plaats dan zelf in `public/fonts/`:

```
public/fonts/thesans-plain.woff2   (TheSans 5 Plain)
public/fonts/thesans-bold.woff2    (TheSans 7 Bold)
```

De bijbehorende `@font-face`-regels staan al in `src/styles/contract.css`.
(De trial-`.otf`'s moeten eerst naar glyf-based woff2 worden geconverteerd —
de CFF-trial faalt anders op de browser-sanitizer OTS.)

## Andere huisstijlen

Utrecht en de overige thema's gebruiken het systeemfont als fallback; lever een
gemeente een eigen webfont, dan zet je dat via `--brand-font-body` /
`--brand-font-heading` in het thema-blok (zie `README.md`, Route A).
