import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const reference = 'plugins/cab-approval-bridge/skills/approval-bridge/references/autonomy-and-ateliers.md';
const contract = read(reference);
const section = contract.split('## Examen coordonné des bancs de test')[1];

test('échec local : le pilote examine les bancs et poursuit la voie autorisée', () => {
  assert.ok(section);
  assert.match(section, /critère empêché[\s\S]*capacité manquante[\s\S]*bancs pertinents connus/);
  assert.match(section, /orchestrateur examine les bancs pertinents[\s\S]*disponibilité observée/);
  assert.match(section, /motive les voies écartées[\s\S]*voie pertinente reste possible/);
  assert.match(section, /investigation\s+incomplète reste non vérifiable/);
});

test('restriction Desktop et preuve LXC restent limitées à leur périmètre', () => {
  assert.match(section, /interdiction\s+d’installation limitée au Desktop ne s’étend pas au LXC sans source applicable/);
  assert.match(section, /preuve d’intégration LXC peut être utile sans qualifier le profil Desktop/);
  assert.match(section, /priorité de l’atelier[\s\S]*réservations[\s\S]*permissions natives/);
  assert.match(section, /déclaration seule ne prouve ni disponibilité effective ni allocation nouvelle/);
  assert.match(section, /Ne pas cocher\s+un critère global incomplet/);
});

test('le contrat distribué au codeur contient exactement la référence et son empreinte', () => {
  const bundles = ['broker', 'scripts'].map(group => JSON.parse(read(`plugins/cab-approval-bridge/${group}/cgpt-approval-bridge-contract.json`)));
  assert.deepEqual(bundles[0], bundles[1]);
  const doc = bundles[0].documents['autonomy-and-ateliers.md'];
  assert.equal(doc.content, contract);
  assert.equal(doc.sha256, createHash('sha256').update(contract).digest('hex'));
});
