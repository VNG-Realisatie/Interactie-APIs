# Sunsetting Policy

API's en schemas hebben een levenscyclus. Om stabiliteit te bieden aan gebruikers, maar tegelijkertijd innovatie mogelijk te maken, hanteren we een sunsetting policy.

## Statussen

1. **Stable**: Actief onderhouden en aanbevolen voor gebruik.
2. **Deprecated**: Nieuw gebruik wordt ontmoedigd. Er is een opvolger beschikbaar.
3. **Sunset**: De standaard wordt op een specifieke datum uitgefaseerd.

## Hoe we sunsetten

1. **Markering**: In de OAS/AsyncAPI wordt het veld `deprecated: true` toegevoegd.
2. **Sunset Header**: In API responses wordt de `Sunset` HTTP header gebruikt.
3. **Registry**: Elke sunsetting wordt opgenomen in dit overzicht met de geplande einddatum.
4. **Archivering**: Pas nadat een standaard volledig is uitgefaseerd en niet meer in gebruik is, wordt de documentatie verplaatst naar de `archive/` folder van de documentatie portal. De bestanden blijven in de `main` branch staan om `$ref` links niet te breken.
