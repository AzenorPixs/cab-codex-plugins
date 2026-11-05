# Qualification SCM — CAB2.1.15

## Mandat et résultat

Le développeur demande de retrouver un état de développement normal et autorise un nouveau correctif si nécessaire. Le change ciblé fix-cabu-startup-recovery corrige l’attente de démarrage et la conservation non terminale des échecs de rollback. Il conserve l’isolation MCP2.1.14 et toutes les permissions/versions/manifeste/readiness requises. Aucun modèle, protocole de décision, RUN ou donnée métier réécrit. Les codes de démarrage ne sont plus masqués par un diagnostic générique du broker.

Le budget existant waitMs,120000ms par défaut et900000ms maximum, est appliqué au contrôleur cible et restauré. Le seul état systemd active ne vaut pas succès : /status doit servir la version attendue. PREPARATION_FAILED est réservé aux phases PREPARING/PREPARED. Un rollback encore échoué reste ROLLBACK_FAILED ; ses répétitions ne créent pas un autre journal.

## Preuves et limites

- Updater ciblé45/45, dont démarrage prêt à15s dans budget20s et dépassement du budget500ms ; deux reprises de rollback encore en échec gardent id/phase/sauvegardes, puis succès sur le même journal après résolution.
- Node global573 tests :545 réussis,28 ignorés conditionnels,0 échec ; processus84,110s.
- Python80/80 ; OpenCode2.2.1 privé1/1 avec sonde sûre, conflit et récupération ciblée sans changer le PID privé.
- Syntaxe56JavaScript/16Python, UTF-8/LF et trois copies broker identiques.
- OpenSpec17/17 standard/strict avant archive.
- ORCHESTRATED_CODING.md inchangé, SHA256962ced4a2ded1bdb4d57c90b61ac41f28d7cb1f603ae9a82ac2dfd15cf1277d4.

L’échec réel2.1.14 est conservé dans update-0f1b36d2-bfce-4a15-818a-e4d4330c4531. Sa reprise s’est terminée après10,329s à partir de startAll, avec le reclassement incorrect PREPARATION_FAILED. Le premier échec masque sa cause précise ; la borne10s et ce reclassement sont prouvés par le code/journal, sans attribuer arbitrairement la cause à une session. Les services restaurés2.1.13 et le broker artefact2.1.14 ont été observés conformes à previousVersions ; le raccord natif du broker restauré a été rétabli explicitement, sans modifier le journal ni les RUN. Une demande PENDING interrompue reste à réconcilier par son propriétaire après alignement ; aucun READY global ni retour au développement normal n’est déduit de cet état mixte.

Preuves ignorées par Git : output/scm-cabu-startup-recovery/{targeted.log,node-global.log,python-global.log,native-global.log,source-verification.json,previous-rollback-observed.json,openspec-before-standard.log,openspec-before-strict.log}. Les journaux d’activation2.1.14 restent conservés dans output/scm-mcp-location-isolation/.

## Matrice documentaire

| Document | État et justification |
| --- | --- |
| AGENTS.md | Inchangé ; sécurité, scope, tests et autorisations SCM conservés. |
| PROJECT.md | Version2.1.15 et section attente/récupération. |
| TECHNICAL.md | Version et budget existant documentés, contrôles réels conservés. |
| BUILD.md | Jeu commun et reprise du même journal documentés. |
| DEVOPS.md | Inchangé, généré ; outils désignés utilisés. |
| DEVELOPMENT_MAP.md | Seule entrée provisoire de ce change, code non attribué, liens et état ; aucune reconstruction. |
| openspec/BATCH_CODES.md | Même entrée provisoire ; code à attribuer par ACL ultérieur. |
| README.md | Version et limite de démarrage/récupération documentées. |
| CHANGELOG.md | Entrée2.1.15 ; historique2.1.14 conservé. |
| openspec/config.yaml | Inchangé, spec-driven adapté. |
| openspec/specs/ | Trois exigences ajoutées dans active-component-update et distribution. |
| Skill/commande/référence CABU | Budget --wait-ms et ROLLBACK_FAILED non terminal explicités ; versions communes. |
| ORCHESTRATED_CODING.md/template | Aucune écriture, protocole embarqué conservé. |

## Clôture et activation

Éligibilité à l’archive établie sur ces contrôles. Archive/statistiques/publications sont vérifiées séparément ; CABU et notifications restent des étapes réelles après publication. Les fenêtres purement textuelles de deux sessions ont été autorisées sans outil natif/MCP ni écriture de projet ; retour idle demandé avant coupure. La reprise des demandes interrompues reste une décision unitaire de chaque propriétaire, jamais une reconstruction par l’updater.

Après archivage : OpenSpec standard16/16 et strict16/16 ; trois blocs synchronisés identiques, liens et rapport six sections vérifiés. Aucun bilan de blocage à nettoyer.
