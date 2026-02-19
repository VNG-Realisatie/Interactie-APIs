# API Portal Design Principes

Dit document beschrijft de architecturale principes voor dit portal en hoe de APIs worden onderhouden. Het doel is een consistent, herbruikbaar en testbaar ecosysteem van APIs en data-modellen.

## De Rol van JSON Schema & Patronen

Om consistentie te waarborgen en dubbel werk te voorkomen, scheiden we de *data-definitie* van de *API-interactie*.

- **JSON Schemas (`/schemas`)**: Dit zijn de 'bouwstenen' van onze data. Ze definiëren objecten (zoals `Adres` of `Zaak`) onafhankelijk van hoe ze in een specifieke API worden gebruikt.
- **Patronen (`/patterns`)**: Dit zijn herbruikbare API-fragmenten voor OpenAPI (OAS). Denk aan standaard paginering parameters, foutberichten of headers.

## Herbruikbaarheid via HTTP URLs

Schemas en patronen zijn **onafhankelijk** van specifieke APIs.
- In plaats van het kopiëren van definities, refereren APIs naar de stabiele HTTP URL van een schema (bijv. op GitHub Pages).
- Dit zorgt ervoor dat een `Adres` er in elke VNG API exact hetzelfde uitziet, wat integraties voor afnemers aanzienlijk vereenvoudigt.

## Kleine YAML Specificaties

Door intensief gebruik te maken van `$ref` naar gedeelde schemas en patronen, blijven onze OpenAPI (`.yaml`) bestanden klein en leesbaar.
- De focus in een API-specificatie ligt op de *business logica* (endpoints en procesflow).
- De technische details van data-objecten en standaard parameters worden gedelegeerd aan de centrale bibliotheek.
- Dit verlaagt de onderhoudslast en verkleint de kans op inconsistente kopieën van definities.

## Testbare & Stabiele APIs

Consistentie in ontwerp leidt direct tot betere testbaarheid:
- **Automated Mocking**: Dankzij gedeelde schemas kunnen we betrouwbare mock-servers genereren die consistent gedrag vertonen over verschillende APIs heen.
- **Contract Testing**: Afnemers kunnen hun code valideren tegen de centrale schemas, wetende dat deze stabiel zijn dankzij ons versiebeheer.

## Expliciet Versiebeheer (Immutability)

Wij gebruiken **geen** 'latest' of 'v1' aliassen voor schemas. Elke referentie is expliciet (bijv. `adres/0.0.1.json`).

### Waarom?
- **Voorspelbaarheid**: Een wijziging mag nooit leiden tot het onverwacht "breken" van een bestaande API-implementatie.
- **Reproduceerbaarheid**: Build-pipelines en versienummers blijven betekenisvol omdat de onderliggende definities niet stilletjes veranderen.
- **Caching**: CDN's kunnen expliciete versies veilig voor lange tijd cachen.

## Semver als Status

- **0.x.x**: Kandidaat of experimenteel. Kan breaking wijzigingen bevatten.
- **1.x.x**: Stabiel en in productie. Volgt strikt semver-regels (geen breaking changes in minor/patch).

## Deprecation over Deletion

Bestanden worden nooit verwijderd. Gebruik `deprecated: true` in het schema om aan te geven dat een versie niet meer de voorkeur heeft.
