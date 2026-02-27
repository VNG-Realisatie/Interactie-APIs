# VNG Interactie APIs

| Eigenaar | Ingevuld door |
| --- | --- |
| Project Omnichannel - MijnServices / Team Dienstverlening | Joep Meindertsma |

Deze repository bevat de API-standaarden, gedeelde schemas en patronen voor de VNG Interactie API's.

Bekijk op [vng-interactie-apis.netlify.app](https://vng-interactie-apis.netlify.app).

## Status: Pre-alfa

Dit project is nog in ontwikkeling, de API's en schema's vertegenwoordigen nog geen officiële standaarden.

## Wat doet deze repository

- **API Specificaties**. Dit beschrijft hoe APIs werken, welke endpoints er zijn, en wat voor soort antwoorden ze geven. De APIs zijn beschreven in OpenAPI spec of AsyncAPI spec.
- **JSON Schemas**. Dit beschrijft hoe de datamodellen er uit zien. Deze kunnen worden hergebruikt tussen API specificaties.
- **Patterns**. Dit zijn manieren waarop APIs zijn ontworpen
- **Versiebeheer**. Van alle schemas, APIs en patterns worden versies bijgehouden.

## Structuur

- `apis/`: API-definities.
  - `rest/`: OpenAPI (OAS) specificaties voor RESTful services.
  - `events/`: AsyncAPI specificaties voor event-driven architecturen.
- `schemas/`: Gedeelde JSON-schemas voor data-objecten, onafhankelijk versied.
  - `[object]/[semver].json`: Expliciete versiebeheer (bijv. `adres/0.0.1.json`).
- `patterns/`: Herbruikbare API-fragmenten (bijv. paginering).
- `docs/`: Governance, Design Principes en Architectural Decision Records (ADRs).
- `archive/`: Gearchiveerde versies (zie [Sunsetting Policy](docs/governance/sunsetting.md)).

## Governance & Bijdragen

Wij maken gebruik van een gestructureerd governance-model met specifieke rollen:

- **Communitymanager**: Intake en stakeholdermanagement.
- **PO Proces/Generiek**: Functionele bewakers.
- **Tech Lead**: Technische standaarden en platformregie.

Zie [CONTRIBUTING.md](CONTRIBUTING.md) voor meer details over het proces van businesswens naar API-schema.

## Lokale Ontwikkeling

Om de API-specificaties lokaal te bekijken of te testen:

1. **Installatie**:

   ```bash
   pnpm install
   ```

2. **Alles-in-één development** (Portal + Mock Servers):

   ```bash
   pnpm run dev
   ```

   Dit start automatisch:
   - Het **Interactie APIs Portal** op [http://localhost:3000/](http://localhost:3000/)
   - De **Mock Servers (Gateway)** op [http://127.0.0.1:4010](http://127.0.0.1:4010)

3. **Linter uitvoeren** (Optioneel):
   Controleer of je wijzigingen voldoen aan de Nederlandse API-strategie:

   ```bash
   pnpm run lint
   ```

De officiële API-specificaties zijn te bekijken via onze [Interactie APIs Portal](https://vng-realisatie.github.io/Interactie-APIs/).
