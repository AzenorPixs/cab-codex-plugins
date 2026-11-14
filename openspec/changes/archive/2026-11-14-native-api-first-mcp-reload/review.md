# Revue ciblée CAB3.2.6 — 14 novembre2026

Le périmètre couvre les trois connecteurs distincts, API natives prioritaires,
accès OS sans politique de modes, versionnement des pavés Agents et dépendance git.
Migration0017 additive ; aucun RUN ni reçu historique converti ou réécrit.

## Qualification

- 17 contrôles PostgreSQL/inventaire/ateliers : exécutés et réussis dans le
  conteneur dédié cab-300-package-test. Les anciennes attentes de chmod/refus
  numérique des parents sont remplacées conformément au mandat explicite.
- Contrôle CAB TEST-NATIVE-326-RELEASE-05 : 12 tests purs réussis et rechargement
  réel des deux SDK sur profils temporaires, ancien/nouveau processus et vrai
  tools/list3.2.6, SID de fixture conservé, zéro tour LLM.
- Échecs antérieurs conservés : l'atelier ne fournissait pas /tmp au SDK natif.
  Un /tmp tmpfs privé corrige l'environnement ; aucun accès hôte supplémentaire.
- Reçus natifs CAB NATIVE-OC-326-HOST-QUALIFICATION et
  NATIVE-CLI-326-HOST-QUALIFICATION : COMPLETED, sans rejeu. Les observations
  de ces appels en3.2.5 qualifient leur mécanisme, pas l'installation3.2.6.
- tsc/vite : exécutés et réussis. Avertissements amont use-client inchangés.
- Migration fixture et contrôle makemigrations --check --dry-run : réussis.

Le contrôle contractuel frais est repris après archivage sur la révision finale.
La livraison et l'activation3.2.6 restent exclusivement celles du reçu
CABU-SCM-NATIVE-326. Un client stdio non encore raccordé reste explicitement
adoption_required ; aucun daemon isolé n'est présenté comme sa connexion.

## Cohérence documentaire

AGENTS.md et CODING_RULES.md : inchangés, règles communes conservées et mandat
explicite prioritaire pour les modes POSIX. PROJECT.md/TECHNICAL.md : actualisés
sur API, profils et accès ; BUILD.md : migration0017 et livraison3.2.6.
DEVOPS.md : génération DIU existante incluse, aucune édition manuelle.
DEVELOPMENT_MAP.md : amendement ciblé du seul change, sources et activation séparées.
README.md et CHANGELOG.md : comportement3.2.6 et limites de première adoption.
OpenSpec system-platform : delta API/accès/versions/git et remplacement explicite
du seul ancien contrat de réparation des parents directs. Documentation opérateur,
skills et commandes : versions alignées et distinction CLI/Desktop.

Les rapports STATISTICS.md restent exclusivement amendés par CAB. Les anciens
rapports amendés automatiquement présents dans l'inventaire SCM sont conservés.
