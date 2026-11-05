# L2 — Maintenir le contrôleur pendant une récupération gelée

## Why

Le contrôleur original 1.7.1 et son outil update refusent une maintenance
pendant toute récupération. Le lot REJECTION_ONLY ne peut donc pas être
chargé par la voie ordinaire. Le développeur a autorisé le lot source/tests
L2, transmis depuis le chat C08 le 2026-10-25, sans activation réelle.

## What Changes

- Définir un profil explicite frozen-recovery-controller avec autorisation
  spécifique, preuve indépendante d'absence d'effet et reçu BOOTSTRAP_HELD.
- Conserver le vrai DRAINING du contrôleur original et son refus de HELD ;
  le reçu est une nouvelle autorité bornée d'arrêt, jamais un faux HELD.
- Préserver OpenCode, broker, Web, RUN/job/candidate/recovery et préfixes
  natifs ; arrêter seulement le superviseur et le contrôleur gérés concernés.
- Charger le jeu cohérent puis adopter et recontrôler le reçu dans le nouveau
  contrôleur avant confirmation HELD et libération de maintenance.
- Qualifier sur processus originaux et corrigés réels de fixture, broker
  original conservé et chaîne REJECTION_ONLY/refus/polling/retry inchangée.

## Capabilities

### Modified Capabilities

- `active-component-update`: profil, autorité d'amorçage et repli conservatoire.
- `controller-transport`: adoption et maintenance de récupération gelée.
- `concurrent-run-coordination`: preuve cumulative et préservation des pairs.
- `codex-integration-distribution`: alignement source et paquet 1.8.0 demandé en SCM.
- `native-session-statistics`: annonce de version du bilan courant, sans modification de mesure.

## Impact

Extension explicite du développeur en SCM : ajouter le support générique des
releases à liens relatifs et un diagnostic filtré des métadonnées PENDING,
sans annulation, installation ni intervention vivante implicite.

Controller, update, nouveau maintenance-proof, diagnostic approval-metadata,
entrée du moniteur par lien relatif, tests et documentation
concernée. Aucun changement du retry/complete/ask/once, de dépendance, de Git,
de Pixs, du registre vivant, des services réels ou des caches installés.
L'activation réelle et la réparation C08 exigent des autorisations distinctes.

Le SCM explicitement demandé autorise la finalisation et l'archivage des deux
changes source ciblés, avec leurs rapports de statistiques. Il ne constitue
aucune autorisation d'installation ou de réparation opérationnelle.
