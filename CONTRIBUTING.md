# Bijdragen aan VNG API Standaarden

Welkom! Dit repository is de centrale plek voor API-harmonisatie binnen de Nederlandse gemeenten. Om de kwaliteit en herbuikbaarheid te waarborgen, hanteren we een gestructureerd proces.

## Governance Rollen

- **Communitymanager**: Eerste aanspreekpunt voor nieuwe initiatieven. Verantwoordelijk voor de intake en het verbinden van gemeenten.
- **Productowner (PO) Procesgerelateerde Functies**: Eigenaar van de inhoud van domein-specifieke API's (in `apis/`).
- **Productowner (PO) Generieke Functies**: Eigenaar van de gedeelde bouwblokken (in `schemas/` en `patterns/`).
- **Tech Lead**: Bewaker van de technische standaarden, beveiliging en architecturale consistentie.

## Het Bijdrage-proces

### 1. Intake (De Businesswens)
Nieuwe ideeën beginnen altijd als een **GitHub Issue**. Gebruik hiervoor het template "Businesswens". De Communitymanager beoordeelt of de wens aansluit bij de roadmap en of er al bestaande oplossingen zijn.

### 2. Ontwerp (RFC)
Voor grote wijzigingen of nieuwe services maken we een Architectural Decision Record (ADR) of RFC in de `docs/rfcs/` folder. Dit wordt getoetst door de Tech Lead en de relevante PO.

### 3. Implementatie (Pull Request)
Pas na goedkeuring van het ontwerp wordt er code geschreven.
- **Hergebruik verplicht**: Controleer eerst of er bestaande schemas in `schemas/` of patronen in `patterns/` zijn die je kunt gebruiken.
- **Linter**: Elke PR wordt automatisch gecontroleerd door Spectral op basis van de Nederlandse API-strategie.
- **CODEOWNERS**: Je PR vereist automatisch goedkeuring van de Tech Lead of PO zodra je gedeelde componenten wijzigt.

### 4. Promotie van Schemas
Nieuwe gedeelde schemas landen eerst in `schemas/candidates/`. Zodra een schema in minimaal twee verschillende services wordt gebruikt, wordt het gepromoveerd naar `schemas/v1/`.

## Definition of Done
Een bijdrage is pas 'klaar' als:
- [ ] De linter (Spectral) geen fouten geeft.
- [ ] De API-specificatie (OAS/AsyncAPI) valide is.
- [ ] Er is verwezen naar een goedgekeurd Issue.
- [ ] Eventuele nieuwe patronen zijn gedocumenteerd.
