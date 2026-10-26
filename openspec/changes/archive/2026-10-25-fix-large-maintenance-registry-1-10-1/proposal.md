# CAB 1.10.1 — lectures bornées du registre de maintenance

## Why
Le registre Pixs observé fait 9 602 547 octets en HTTP et 13 321 688 octets sur disque. La maintenance 1.10.0 refuse avant effet avec update-response-too-large (limite 2 Mio) ; le contrôle privé HELD est limité à 4 Mio. Aucun état ne doit être purgé pour contourner ces bornes.

## What Changes
- 16 Mio uniquement pour GET /runs et le fichier controller-runs.json vérifié sous maintenance ; conserver 2 Mio pour les autres réponses et 4 Mio pour les autres fichiers.
- Tests des bornes, lecture complète et qualification à deux UID avec registre dépassant les anciennes limites.
- Incrément explicite de 1.10.0 vers 1.10.1 de toutes les sources et métadonnées distribuées ; conserver 1.10.0 parmi les versions chargées qualifiées.
- Mise à jour locale des briques et reprise des mêmes CISMP après contrôles, sans fermeture OpenCode, selon les autorisations humaines distinctes du travail source.

## Capabilities
### Modified Capabilities
- active-component-update : lectures bornées d'un registre volumineux sans perte de preuves.
- codex-integration-distribution : jeu cohérent 1.10.1 et installation locale explicitement demandée.

## Impact
update.mjs et bancs de maintenance, versions des briques, tests et supports courants, cadrages et changelog. Ni nouvelle dépendance, ni migration/purge de données, ni modification de modèle des RUN historiques. Les anciennes releases et archives sont conservées. Aucun commit, push, branche ou inspection Git.

## Autorisations
Le développeur a explicitement validé le correctif 16 Mio avec tests, qualification deux UID, archivage, déploiement et reprise ; puis demandé incrément 0.0.1 et SCM, et remise à jour de toutes les briques CAB locales. Les CISMP1/6/7 sont en PAUSE avant effet. La création/synchronisation/archivage de ce seul change et son rapport sont inclus dans ce périmètre déjà validé.
