# VNG API Standards and Schemas

Dit repository bevat de API-standaarden, gedeelde schemas en patronen voor het Nederlandse gemeentelijke landschap (Common Ground).

## Structuur

- `apis/`: API-definities.
    - `apis/rest/`: OpenAPI (OAS) specificaties voor RESTful services.
    - `apis/events/`: AsyncAPI specificaties voor event-driven architecturen.
- `schemas/`: Gedeelde JSON-schemas voor data-objecten (bijv. Adres, Organisatie).
    - `schemas/v1/`: Stabiele, gepromoveerde schemas.
    - `schemas/candidates/`: Voorgestelde nieuwe gedeelde schemas.
- `patterns/`: Herbruikbare API-fragmenten (bijv. paginering, zoek-endpoints).
- `docs/`: Governance, Design Principes en Architectural Decision Records (ADRs).
- `archive/`: Gearchiveerde versies (zie [Sunsetting Policy](docs/governance/sunsetting.md)).

## Governance & Bijdragen

Wij maken gebruik van een gestructureerd governance-model met specifieke rollen:
- **Communitymanager**: Intake en stakeholdermanagement.
- **PO Proces/Generiek**: Functionele bewakers.
- **Tech Lead**: Technische standaarden en platformregie.

Zie [CONTRIBUTING.md](CONTRIBUTING.md) voor meer details over het proces van businesswens naar API-schema.

## Visualisatie

De API-specificaties zijn te bekijken via ons [API Portal](https://vng-realisatie.github.io/vng-apis-schemas/).
