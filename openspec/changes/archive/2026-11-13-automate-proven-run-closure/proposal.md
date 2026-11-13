# Clôture autonome et archivage des sessions sur preuves

Code non attribué ; attribution ultérieure par ACL.

## Why
Des RUN restent WORKING après archive, et des imports CLOSED sont masqués par
IMPORT_PROTECTED avec étape absente. Le contrôle courant appartient à CAB.

## What Changes
Évaluation backend commune au worker et à l'icône Réévaluer/clôturer. Clôture
normale automatique seulement après revue valide, archive complète et effets
résolus. Les historiques exigent confirmation explicite ; les services sans
preuve terminale restent ouverts/protégés. Les imports sont vérifiés contre
leur snapshot chiffré sans lever leur protection.
Page /projects/<ID>/archives et archivage explicite des seules sessions CLOSED
validées dans une table dédiée, sans supprimer RUN/SID/preuves.

## Impact
Django, migration additive, worker CAB, API/CLI/MCP, TanStack/Electric et
clients légers. CI/CD3.1.4 et CABU, tests ciblés et preuves réelles. Aucun rejeu.
