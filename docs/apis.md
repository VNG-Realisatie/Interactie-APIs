# APIs (OpenAPI)

## Wat zijn APIs?

In dit portaal vind je de **Application Programming Interfaces (APIs)**. Dit zijn de afspraken en koppelvlakken waarmee applicaties binnen en buiten de gemeente met elkaar kunnen communiceren. Elke API is beschreven met de **OpenAPI 3.1 Specificatie (OAS)**.

## Waarom bestaan ze?

APIs zorgen ervoor dat gegevens veilig, gestructureerd en uniform kunnen worden opgevraagd of gewijzigd. Door deze APIs centraal te definiëren en te ontwerpen vanuit de Common Ground architectuur, voorkomen we dat elke applicatie een eigen koppelvlak ('dialect') spreekt. Dit verlaagt de integratiekosten drastisch.

## Relatie tot Schemas en Patronen

- **Schemas**: De APIs herbruiken centrale **JSON Schemas** (zoals een `Zaak` of een `Adres`). De OpenAPI specificeert *hoe en met welke operaties (GET, POST)* je de data benadert; het Schema specificeert *hoe de data zelf er exact uitziet*.
- **Patronen**: APIs worden ontworpen volgens gestandaardiseerde herbruikbare **Patronen** (zoals Paginering of Foutafhandeling). Dit zorgt voor een consistente ervaring voor ontwikkelaars. Als je één API snapt, snap je ze allemaal.
