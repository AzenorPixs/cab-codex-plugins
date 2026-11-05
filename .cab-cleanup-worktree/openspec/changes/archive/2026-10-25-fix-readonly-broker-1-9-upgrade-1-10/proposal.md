# MAI05 — Maintenance reuse-readonly 1.9.0 vers 1.10.0

## Why
Le validateur du paquet 1.10.0 admet 1.7.1, 1.8.0 et VERSION, mais omet le broker 1.9.0 réellement chargé. La preuve exacte est refusée avant effet alors que les trois artefacts externes sont identiques à la cible 1.10.0.

## What Changes
Ajouter seulement 1.9.0 aux versions chargées admises, sans élargissement générique aux versions inconnues. Qualifier les refus existants et le cycle réel à deux UID, avec conservation des artefacts broker, du processus OpenCode, des PAUSE et des identités.

## Capabilities
### Modified Capabilities
- active-component-update : transition ordinaire reuse-readonly depuis 1.9.0 vers la cible 1.10.0.

## Impact
broker-artifact-proof.mjs, tests/active-component-update.test.mjs et banc deux UID, documentation de maintenance et changelog. Version de base conservée à 1.10.0 ; aucune nouvelle dépendance, migration, configuration de fournisseur ou action Git. Les caches installés ne sont jamais édités manuellement.

## Autorisation
Correction et qualification explicitement validées par le développeur dans le chat 1CISMP2 (réponse Faire corriger et qualifier par le chat CAB, call_4872258bc10942c1ba4cecad333ab99e), vérifiées dans le message humain natif. Le présent chat possède aussi l'autorisation de mise à jour des services, de demande de PAUSE puis de reprise. Le correctif source ne vaut pas preuve de déploiement ; la bascule reste une transaction de maintenance distincte.
