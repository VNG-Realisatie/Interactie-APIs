// Eén commando voor de MijnOverheid-op-IKO demo: start de stack (zonder de
// burgerportaal-frontend, die poort 5180 zou bezetten), seedt IKO en Open
// Klant, en wacht tot de facade echt antwoordt. Idempotent: opnieuw draaien
// kan altijd.
//
//   npm run demo
//
// Daarna: `cd ../mijnoverheid && pnpm dev` en volg het draaiboek in README.md.

import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const COMPOSE = ['docker', 'compose', '-f', path.join(ROOT, 'deploy/docker-compose.yml')];
// Dependencies (IKO, Keycloak, databases) komen automatisch mee. De
// burgerportaal-frontend draait op 5181 en kan dus naast de MijnOverheid-app
// (5180) bestaan.
const SERVICES = ['gateway', 'frontend', 'lab-mocks', 'open-klant', 'open-klant-redis'];

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`\n❌ Commando faalde: ${cmd} ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
}

async function waitFor(name, url, { expect = 200, attempts = 100, delayMs = 3000 } = {}) {
  process.stdout.write(`⏳ Wachten op ${name} `);
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status === expect) {
        console.log('✅');
        return;
      }
    } catch {
      // nog niet bereikbaar
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, delayMs));
  }
  console.error(`\n❌ ${name} kwam niet op tijd op (${url}).`);
  process.exit(1);
}

console.log('🐳 Stack starten (zonder burgerportaal-frontend)...');
run(COMPOSE[0], [...COMPOSE.slice(1), 'up', '-d', '--build', ...SERVICES]);

console.log('\n🌱 IKO seeden (connectoren + dataprofielen)...');
run('npm', ['--prefix', path.join(ROOT, 'iko-config'), 'install']);
run('node', [path.join(ROOT, 'iko-config/seed-iko.js')]);

// IKO laadt connector-routes bij het opstarten; na (her)seeden dus herstarten.
console.log('\n🔄 IKO herstarten zodat de connectoren geladen worden...');
execSync('docker restart iko-application', { stdio: 'inherit' });

console.log('\n🌱 Open Klant vullen met de demo-persona...');
run('node', [path.join(ROOT, 'iko-config/seed-openklant.js')]);

await waitFor('mocks', 'http://localhost:4010/health');
// IKO (Spring Boot) doet er even over; de facade-call bewijst de hele keten
// gateway -> Keycloak -> IKO -> bron.
await waitFor('IKO via de facade', 'http://localhost:3000/apis/rest/gesprekken/next/gesprekken');

console.log(`
🎉 Demo-stack staat klaar!

Demo 1 — MijnOverheid-app via IKO (zelfde app, andere backend):
  1. Start de MijnOverheid-app:  cd ../mijnoverheid && pnpm dev
  2. Open http://localhost:5180 en volg het draaiboek in README.md

Demo 2 — Burgerportaal met DigiD-simulatie (user-scoped):
  1. Open http://localhost:5181
  2. Log in als jeroen/jeroen of anna/anna — "Mijn gegevens" komt per
     BSN uit de echte Open Klant.

Handige adressen:
  - IKO Admin UI:   http://localhost:8080/admin  (admin/admin)
  - BFF Gateway:    http://localhost:3000/health
  - Gateway-logs:   npm run logs -- gateway
`);
