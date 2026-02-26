# Schemas (JSON)

## Wat zijn Schemas?

Schemas beschrijven de exacte structuur van datamodellen in het formaat van **JSON Schema**. Ze definiëren precies welke velden verplicht zijn, welke datatypes worden gebruikt (zoals tekst, een boolean of datum), enumeraties en hoe relaties met gerelateerde of externe bronnen werken (via `$ref`).

## Waarom bestaan ze?

Door de datamodellen los te trekken van de APIs creëren we herbruikbare **bouwblokken**. Het concept van een `Adres`, een `Zaak` of een `Contactpersoon` hoeft zo maar op één centrale plek gedefinieerd te worden. Dit zorgt voor landelijke standaardisatie en dwingt één duidelijke informatiestructuur af, zonder dat dit voor iedere API opnieuw moet worden vastgesteld.

## Waarom JSON Schema?

- De OpenAPI Spec (een ["Pas toe of leg uit" standaard](https://www.forumstandaardisatie.nl/open-standaarden/verplicht)) werkt intern met JSON Schema
- JSON is het meestgebruikte serialisatieformaat

## Relatie tot APIs en Patronen

- **APIs**: Een API is vaak de transportlaag die data ophaalt of muteert. De OpenAPI specificatie (OAS) verwijst in zijn requests (payloads) en responses direct met `$ref` naar deze JSON Schemas.
- **Patronen**: Schemas maken soms zelf ook weer gebruik van gestandaardiseerde patronen. Denk hierbij aan het afdwingen van een gedeeld datatype defenitie om consistentie in identifiers (bijv. een UUID-vorm) in de schemas te borgen.
