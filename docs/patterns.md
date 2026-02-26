# Patronen

## Wat zijn Patronen?

Patronen zijn generieke, herbruikbare oplossingen of afspraken voor veelvoorkomende ontwerpvraagstukken in APIs en datamodellen. Denk hierbij aan hoe we omgaan met **Paginering (Pagination)**, **Foutmeldingen (Problem Details according to RFC 7807)**, het loggen van **Gebeurtenissen (Events)** of **Authenticatie**.

## Waarom bestaan ze?

Wanneer elke API op een andere manier zijn foutmeldingen teruggeeft of paginering oplost, wordt het voor afnemers (ontwikkelaars) onnodig complex en tijdsintensief om applicaties te koppelen. Patronen zorgen direct voor een uniforme integratiearchitectuur: "Write once, run everywhere".

## Relatie tot APIs en Schemas

- **APIs**: APIs importeren deze patronen direct in hun OpenAPI specificatie. Een `GET /zaken` endpoint maakt bijvoorbeeld zonder meer gebruik van het centrale `pagination.yaml` patroon voor het bepalen van hoe resultaten verdeeld worden over pagina's.
- **Schemas**: Patronen kunnen zich ook uiten als fundamentele velden (bijv. voor metadata) die verplicht zijn of consistent moeten terugkeren in JSON schemas.
