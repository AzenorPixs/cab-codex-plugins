# Nettoyages demandés

Inventaire public observé le 8 novembre 2026 ; à revérifier avant chaque effet.
Les fichiers métier et rapports OpenSpec de Pixs restent conservés.

| Cible | RUN contrôleur | État observé | Nettoyage CAB |
|---|---|---|---|
| C08 / CISMP1 | `cismp1-pixs-02716fc18b3546c0` | ABANDONED | Reçu existant STOPPING ; non terminé |
| PA02 / CISMP2 | `cismp2-pixs-797dcac8c8814e27` | ABANDONED | À effectuer |
| PA03 / CISMP3 | `cismp3-pixs-01a17557c728` | ABANDONED | À effectuer ; session native absente |
| PA04 / CISMP4 | `cismp4-pixs-01a175620d7b` | ABANDONED | À effectuer |
| Z12 / CISMP6 | `cismp6-pixs-9dd1542d4c0542f2` | ABANDONED | À effectuer |
| PA01 / CISMP7 | `cismp7-pixs-023c11510a274b19` | RESERVED | Suppression du RUN refusée tant qu’il est actif ; état à clarifier |
| PA10 / CISMP8 | `cismp8-pixs-6f9152399b784e97` | ABANDONED | À effectuer ; copie SGS directe également présente |
| C10 / CISM9 et CISMP9 | `cismp9-pixs-01a1b7f4f00a7232` | RESERVED ; CISM9 poursuit son développement | Nettoyage suspendu ; conserver les données et les deux sessions |
| C97 / CISM10 | Aucun RUN contrôleur correspondant observé | Session directe clôturée | Copie SGS et archives à vérifier puis retirer |

Les demandes concernant les changes et les RUN sont examinées séparément :
une identité commune ne permet pas de supprimer un pair. L’absence n’est
annoncée qu’après vérification des briques et des copies concernées.

## Inventaire au 24 novembre 2026

| Brique | Données et interface | Dépendance de qualification |
|---|---|---|
| Contrôleur | Registre des RUN, contextes, opérations, réservations et rapports. Le pilote 2.x utilise `/transport/status` et `/cleanup/{prepare,seal,status}`. | Adaptateur indépendant à raccorder. La preuve d’identité et de terminalité doit survivre à la purge des données de coordination. |
| Broker | Demandes, décisions, accès, journal signé et reçu propriétaire. Le contrôleur relaie `/cleanup/owner/action` et `/cleanup/owner/check`. | Adaptateur indépendant à raccorder et reçu C08 authentifiable à retrouver. Les effets incertains restent protégés. |
| Superviseur | État du RUN et continuité de transport, vérifiés par `/status` et l’identité du processus. | Adaptateur indépendant à raccorder. |
| Moniteur | Projections et références runtime. `/api/maintenance-identity` identifie le moniteur historique et `/api/snapshot` permet la comparaison des pairs. | Adaptateur indépendant à raccorder. Les ports 8787–8789 du parcours historique ne sont pas en écoute lors du prévol. |
| SGS | Instantanés directs historiques et copies de rapports. `/cleanup/simple-sgs` est propre au contrôleur 2.x. Les statistiques CAB 3.x utilisent PostgreSQL et les `STATISTICS.md` locaux comme sources maîtres. | Revalider la liaison directe de C97/CISM10 et les deux appartenances de PA10. Qualifier l’exclusion du réimport sur chacun des stockages concernés. |
| CCAB | Incidents historiques, `/incidents` et `/purge-incident` dans le runtime 2.x. CAB 3.x expose aussi la purge d’incidents au niveau projet, avec contrôle de révision. | Relier la purge à l’identité exacte du RUN et à sa génération. Les incidents non résolus sont protégés. |
| Archives | `ArchiveContent` identifie les copies CAB par projet, RUN et empreinte. PostgreSQL possède aussi ses archives de session. | Qualifier l’attribution, l’absence de pair dans la copie et les conditions de reprise. Les rapports source OpenSpec sont conservés. |

CAB 3.38.2 est installé et actif sur le port 8790. Les composants 2.x sont
présents dans les sources, et leurs interfaces n’ont pas été observées sur
l’hôte. Le reçu C08 `erasure-65145989-873a-4b1f-b6ca-fb3be05c645c` reste
introuvable aux emplacements standard consultés pour les comptes `ade` et
`devops`. Dernières preuves historiques disponibles pour ce reçu, propriétaire
`APPLIED` et transaction globale `STOPPING`. Le dossier de qualification du
diagnostic conserve le détail de cette distinction.

La qualification de `session.cleanup` sur PostgreSQL 17 isolé couvre les
gardes de CAB 3.x. Les tests d’intégration historiques couvrent la reprise
du format 2.x sur un reçu de test. Les lignes de l’inventaire ci-dessus
restent les références de la recette sur les données réelles.

Sources depuis la racine du projet

- `openspec/changes/archive/2026-11-24-diagnose-frozen-owner-erasure/QUALIFICATION.md`
- `openspec/changes/archive/2026-11-08-remove-released-open-report-snapshots/tasks.md`
- `plugins/cab-approval-bridge/skills/approval-bridge/references/change-erasure.md`
- `docs/sgs-schema.md`
