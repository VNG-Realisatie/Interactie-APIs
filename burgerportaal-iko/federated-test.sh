#!/bin/bash
# Demonstreert het federated-auth-pattern (patterns/federated-auth/next.yaml)
# end-to-end: twee verschillende geregistreerde clients ("plekken"), elk met
# hun eigen Authorization Code + PKCE-flow, halen ieder hun eigen burgerdata
# rechtstreeks op bij de gateway-als-resource-server — geen sessie, geen
# gedeeld servicecredential. Plus: het bewijs dat record-level enforcement
# echt afdwingt (403 bij een BSN-mismatch), niet alleen "toevallig" veilig is.
# Sluit de loop met het discovery-manifest (apis/rest/discovery/next.yaml):
# de client hardcodet niet meer waar een SERVICE (gegevens/taken/producten)
# bediend wordt — hij zoekt dat per service op in GET
# /.well-known/federated-resources (manifest_field hieronder) en
# verifieert dat het echt-ontvangen token de beloofde audience draagt.
# Vandaag delen alle drie services toevallig hetzelfde systeem (IKO); de
# per-service-lookup bewijst dat dat een eigenschap van de huidige
# deployment is, geen aanname in de client-code.
#
# Eerlijke grens: de audience wordt hier nog statisch per Keycloak-client
# afgedwongen (de audience-mapper op mijnoverheid-frontend/nl-portal-frontend
# in realm.json), niet dynamisch via een RFC 8693 token-exchange
# `resource=<audience-uit-manifest>`-aanvraag. Het manifest wordt dus al
# gebruikt om te weten wáár te bellen en om het token te verifiëren, maar
# nog niet om het token type-dynamisch aan te vragen — dat is de logische
# vervolgstap.
set -e

KEYCLOAK=http://localhost:8082/auth/realms/valtimo
GATEWAY_ROOT=http://localhost:3000

echo "== 0. Discovery-manifest ophalen (publiek, geen token nodig) =="
MANIFEST=$(curl -s "${GATEWAY_ROOT}/.well-known/federated-resources")
echo "$MANIFEST" | python3 -m json.tool

# manifest_field <service> <field>
# Zoekt de resource-entry voor een SERVICE op in het manifest en geeft het
# gevraagde veld terug. Dit is de kern van waar het in deze beurt om ging:
# de client vraagt niet "geef me het IKO-adres", hij vraagt "wie bedient
# de 'taken'-service" — vandaag toevallig steeds hetzelfde systeem, maar de
# lookup gebeurt per service, niet één keer globaal.
manifest_field() {
  local service="$1" field="$2"
  echo "$MANIFEST" | python3 -c "
import sys, json
d = json.load(sys.stdin)
entry = next(r for r in d['resources'] if r['service'] == '$service')
print(entry['$field'])
"
}

echo "-> service=gegevens  bediend door: $(manifest_field gegevens baseUrl) (audience: $(manifest_field gegevens audience))"
echo "-> service=taken     bediend door: $(manifest_field taken baseUrl) (audience: $(manifest_field taken audience))"
echo "-> service=producten bediend door: $(manifest_field producten baseUrl) (audience: $(manifest_field producten audience))"

EXPECTED_AUDIENCE=$(manifest_field gegevens audience)

decode_jwt_aud() {
  # JWT-payload (2e segment) decoderen zonder handtekeningverificatie —
  # puur om te tonen dat de audience-claim overeenkomt met het manifest.
  local payload_b64; payload_b64=$(echo "$1" | cut -d. -f2)
  local pad=$(( (4 - ${#payload_b64} % 4) % 4 ))
  payload_b64="${payload_b64}$(printf '=%.0s' $(seq 1 $pad))"
  echo "$payload_b64" | tr '_-' '/+' | base64 -d 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); a=d.get('aud'); print(a if isinstance(a,str) else ','.join(a))"
}

pkce_pair() {
  local verifier
  verifier=$(openssl rand -base64 96 | tr -d '=+/\n' | cut -c1-64)
  local challenge
  challenge=$(printf '%s' "$verifier" | openssl dgst -binary -sha256 | openssl base64 | tr '+/' '-_' | tr -d '=\n')
  echo "$verifier $challenge"
}

# login_via_pkce <client_id> <redirect_port> <username> <password>
# Voert de volledige Authorization Code + PKCE-flow uit met curl (geen browser
# nodig) en print het verkregen access_token.
login_via_pkce() {
  local client_id="$1" port="$2" username="$3" password="$4"
  local kcjar; kcjar=$(mktemp)

  read -r verifier challenge <<< "$(pkce_pair)"
  local state; state=$(openssl rand -hex 8)
  local redirect_uri="http://localhost:${port}/callback"

  local auth_url="${KEYCLOAK}/protocol/openid-connect/auth?client_id=${client_id}&response_type=code&scope=openid&redirect_uri=${redirect_uri}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256"

  local login_page; login_page=$(curl -s -c "$kcjar" "$auth_url")
  local form_action; form_action=$(echo "$login_page" | grep -o 'action="[^"]*"' | head -1 | sed 's/action="//;s/"//' | sed 's/\&amp;/\&/g')

  local callback; callback=$(curl -s -i -b "$kcjar" -c "$kcjar" -X POST "$form_action" \
    -d "username=${username}&password=${password}&credentialId=" \
    -H "Content-Type: application/x-www-form-urlencoded" | grep -i "^location" | tr -d '\r' | cut -d' ' -f2-)

  local code; code=$(echo "$callback" | grep -o 'code=[^&]*' | cut -d= -f2)
  if [ -z "$code" ]; then
    echo "FOUT: geen authorization code ontvangen voor ${client_id}/${username}. Callback: $callback" >&2
    rm -f "$kcjar"
    return 1
  fi

  local token_response; token_response=$(curl -s -X POST "${KEYCLOAK}/protocol/openid-connect/token" \
    -d "grant_type=authorization_code&client_id=${client_id}&code=${code}&redirect_uri=${redirect_uri}&code_verifier=${verifier}")

  rm -f "$kcjar"
  echo "$token_response" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"
}

echo "== 1. mijnoverheid-frontend + jeroen: token ophalen (Authorization Code + PKCE) =="
JEROEN_TOKEN=$(login_via_pkce "mijnoverheid-frontend" 5180 "jeroen" "jeroen")
echo "token ontvangen (${#JEROEN_TOKEN} tekens), aud=$(decode_jwt_aud "$JEROEN_TOKEN") (manifest beloofde: ${EXPECTED_AUDIENCE})"

echo
echo "== 2. nl-portal-frontend + anna: token ophalen (andere 'plek', andere burger) =="
ANNA_TOKEN=$(login_via_pkce "nl-portal-frontend" 5181 "anna" "anna")
echo "token ontvangen (${#ANNA_TOKEN} tekens), aud=$(decode_jwt_aud "$ANNA_TOKEN") (manifest beloofde: ${EXPECTED_AUDIENCE})"

echo
echo "== 3. Jeroen haalt zijn eigen gegevens op (service=gegevens, opgezocht in manifest) =="
curl -s "$(manifest_field gegevens baseUrl)/gegevens" -H "Authorization: Bearer ${JEROEN_TOKEN}" | python3 -m json.tool

echo
echo "== 4. Anna haalt haar eigen gegevens op via nl-portal-frontend (andere plek!) =="
curl -s "$(manifest_field gegevens baseUrl)/gegevens" -H "Authorization: Bearer ${ANNA_TOKEN}" | python3 -m json.tool

echo
echo "== 5. Jeroens taken (service=taken -- ander manifest-lookup, hier toevallig zelfde systeem) =="
curl -s "$(manifest_field taken baseUrl)/taken" -H "Authorization: Bearer ${JEROEN_TOKEN}" | python3 -m json.tool | head -20

echo
echo "== 6. Jeroens producten/vergunningen (service=producten -- weer een eigen manifest-lookup) =="
curl -s "$(manifest_field producten baseUrl)/producten" -H "Authorization: Bearer ${JEROEN_TOKEN}" | python3 -m json.tool | head -20

echo
echo "== 7. Record-level enforcement: Jeroens token gebruikt om Anna's BSN op te vragen -> hoort 403 te zijn =="
curl -s -w "\nHTTP %{http_code}\n" "$(manifest_field gegevens baseUrl)/debug/gegevens-als/123456782" -H "Authorization: Bearer ${JEROEN_TOKEN}"

echo
echo "== 8. Zelfde check maar dan legitiem: Jeroens token voor Jeroens eigen BSN -> hoort 200 te zijn =="
curl -s -w "\nHTTP %{http_code}\n" "$(manifest_field gegevens baseUrl)/debug/gegevens-als/569312863" -H "Authorization: Bearer ${JEROEN_TOKEN}" | tail -c 300
echo

echo
echo "== 9. Zonder token -> hoort 401 te zijn =="
curl -s -w "\nHTTP %{http_code}\n" "$(manifest_field gegevens baseUrl)/gegevens"
