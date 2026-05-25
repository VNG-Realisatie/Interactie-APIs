# MijnServices Demo App

Doel: een doorklikbare demo app (zonder logica / database) om ons meer een gevoel te geven over hoe de MijnServices werken.

Brondata: [deze figma designs](https://www.figma.com/proto/O3Wzm9ANIRHQTK98X0ljYs/VNG-mijn-services-prototype?node-id=9427-21196&starting-point-node-id=9448%3A758053)

[Design discussies](https://github.com/orgs/nl-design-system/discussions/categories/mijn-omgevingen), bijvoorbeeld [deze](https://github.com/orgs/nl-design-system/discussions/394).

Ideeen om deze app te bouwen:

- importeer alle discussies als plaintext en zet ze in deze map
- maak de app en doe hem bijna precies zoals de figma designs

## Uitvoering

- Demo app: `index.html`
- Styles: `styles.css`
- Interactie/data: `app.js`
- Geimporteerde discussies: `discussions/`
- Importscript: `import-discussions.mjs`

De app is statisch en kan direct in de browser worden geopend. In de VNG API lab portal is de app beschikbaar via `/demo/`.
Er is geen database of API nodig.

De Figma-plugin is geprobeerd met file key `O3Wzm9ANIRHQTK98X0ljYs` en met de concrete voorbeeldlink uit discussie 394 (`pB5d6RlVSa1B088Xpm1sSo`, node `5488:3723`), maar beide files konden vanuit de plugin niet worden geopend door een toegangs-/argumentfout. De lokale screenshot `screenshots/mijnzaken.png` is daarom gebruikt als visuele fallback voor de eerste implementatie.
