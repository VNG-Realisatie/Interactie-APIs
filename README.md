# VNG Interactie APIs

Dit repository bevat de API-standaarden, gedeelde schemas en patronen voor het Nederlandse gemeentelijke landschap (Common Ground).

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
   npm install
   ```

2. **API Bekijken (Scalar)**:
   Gebruik onderstaand commando om een specifieke API interactief te bekijken in je browser:

   ```bash
   npm run serve:zaak
   ```

### Stappen

1. Installeer dependencies: `pnpm install`
2. Linter uitvoeren: `pnpm run lint`
3. **Alles-in-één** development (Portal + Mocks): `pnpm run dev`
   - Portal: [http://localhost:3000/docs/](http://localhost:3000/docs/)
   - Mock Server: [http://127.0.0.1:4010](http://127.0.0.1:4010)

Of draai de onderdelen los:

- Alleen de portal: `pnpm run serve`
- Alleen de mocks: `pnpm run mock`

### Voorbeeld Applicatie

Er is een voorbeeld client beschikbaar die communiceert met de mock server:

1. Start de mock server (of de hele dev stack): `pnpm run dev`
2. In een nieuwe terminal, draai de client:

   ```bash
   cd examples/zaak-api-client
   pnpm install
   pnpm start
   ```

De officiële API-specificaties zijn te bekijken via onze [Interactie APIs Portal](https://vng-realisatie.github.io/vng-apis-schemas/).
