# MijnServices Demo App

Een doorklikbare demo van een MijnOmgeving, gebaseerd op de
[Figma-designs](https://www.figma.com/proto/O3Wzm9ANIRHQTK98X0ljYs/VNG-mijn-services-prototype?node-id=9427-21196&starting-point-node-id=9448%3A758053)
en de [NL Design System discussies](https://github.com/orgs/nl-design-system/discussions/categories/mijn-omgevingen).

De app is statisch (HTML/CSS/vanilla JS, geen build). Open `index.html` in de browser,
of bekijk hem in de portal via `/demo/`.

## Bestanden

- `index.html` — markup en navigatie
- `styles.css` — opmaak
- `app.js` — routing, data en interactie
- `discussions/` — geïmporteerde design-discussies (`import-discussions.mjs`)
- `backend/` — optionele MijnTaken demo-server (zie hieronder)

## MijnPlannen

`MijnPlannen` is een takenlijst voor alles wat je na een overlijden moet regelen,
geordend per organisatie (gemeente, belastingdienst, RDW, bank, …). Je kunt filteren
per organisatie, taken afvinken en de voortgang volgen.

Standaard werkt het op statische demo-data; afvinken wordt onthouden in `localStorage`.

De data is gemodelleerd naar het [MijnTaken-contract](../apis/rest/taken/next.yaml),
zodat de lijst live aan een echte API gekoppeld kan worden.

## Live draaien met de MijnTaken-server

Voor een live demo (taken aanmaken/bewerken via een API) draai je de meegeleverde
server, die de app én de API op één URL serveert:

```sh
node backend/server.mjs
# open http://localhost:8787/#plannen
```

Online zetten met één tunnel: `npx cloudflared tunnel --url http://localhost:8787`.

Details en API-endpoints: zie [`backend/README.md`](backend/README.md).
