# Qualification SCM — CAB 2.1.13

## Périmètre et décision

Le développeur valide explicitement « ce correctif sous SCM avec increment de version ». Le change unique release-unused-test-reservations couvre la restitution explicite sans effet, ses preuves, les tests, la documentation, le jeu commun, l’archivage et les publications conditionnelles SCM. Aucun effet réel sur PA01, SSH, réservations, sessions ou services installés n’est effectué. CABU reste distinct.

## Comportement et limites

POST /runs/<runId>/test-resources/release-unused exige une autorisation humaine ciblée et une attestation explicite de l’orchestrateur, les identités et la frontière exactes, tous les accès libérés et les opérations du cycle terminales examinées. Le contrôleur relit deux fois l’historique normalisé complet, recontrôle les fins natives déjà COMPLETED, les once consommées, la session inactive et les permissions. Le reçu unused-no-effect conserve les empreintes et opérations. Aucun parsing sémantique des commandes, nettoyage fictif, succès SSH déduit ou retry exécutable.

Limite assumée : l’absence sémantique d’effet d’un programme arbitraire relève de l’examen explicite de l’orchestrateur ; CAB ne peut pas la prouver par son exit. L’autorisation JSON est une référence dont l’opérateur garantit la provenance, pas une authentification humaine nouvelle. Toute incertitude impose le parcours ordinaire. Aucune utilisation opérationnelle réelle de release-unused n’est prétendue : la nouvelle route est qualifiée sur contrôleurs et serveurs V2 isolés. Le banc natif privé est une régression du raccord existant, pas une restitution du RUN actif.

## Vérifications exécutées et réussies

- Registre et distribution : 67/67 ; nouvelle route HTTP : 7/7.
- Suite Node globale : 562 tests, 534 réussis, 28 ignorés conditionnels, 0 échec ; durée du seul processus 85,744 s.
- Python global : 80/80 ; les benchmarks synthétiques restent des mesures du banc.
- OpenCode privé réel 2.2.1 : 1/1, serveur/fournisseur/broker privés nettoyés ; aucun serveur utilisateur modifié.
- Syntaxe : 56 JavaScript et 16 Python ; UTF-8/LF ; trois copies broker identiques.
- OpenSpec avant archivage : 17/17 standard et strict ; deltas ciblés strict valides.
- SHA-256 du protocole ORCHESTRATED_CODING.md inchangé : 962ced4a2ded1bdb4d57c90b61ac41f28d7cb1f603ae9a82ac2dfd15cf1277d4.

Preuves détaillées ignorées par Git : output/scm-unused-test-reservations/{targeted.log,http-targeted.log,node-global.log,python-global.log,native-global.log,source-verification.json,openspec-before-standard.log,openspec-before-strict.log}.

Les premiers essais ont corrigé deux erreurs du nouveau banc (statut progress 202 et chaîne vide de fermeture du mandat), une simulation d’indisponibilité qui cassait le serveur de fixture, les attentes de version échappées et pyproject.toml. Ils n’ont pas entraîné de retrait de garde ou d’affaiblissement de test. La garde native utilise pendingEffects afin de conserver un job armé à une frontière sûre ; unresolved inclut également armed et ne convenait pas à cette route.

## Matrice documentaire finale

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé : règles OpenSpec, Git et contrôles appliquées ; pas de nouvelle règle générale nécessaire. |
| PROJECT.md | Mis à jour : version source 2.1.13 et section Restitution des réservations sans effet. |
| TECHNICAL.md | Mis à jour : jeu courant et section dédiée, lien vers contrat exact et limites. |
| BUILD.md | Mis à jour : distribution commune et compatibilité du reçu ; activation distincte. |
| DEVOPS.md | Inchangé : généré ; Node24/Python3.14/OpenSpec1.15 et OpenCode privé ont été utilisés sans modifier l’environnement. |
| DEVELOPMENT_MAP.md | Amendement ciblé du seul change, code non attribué, état et liens ; aucune reconstruction ni attribution ACL. |
| openspec/BATCH_CODES.md | Même entrée provisoire ciblée ; attribution ACL ultérieure. |
| README.md | Mis à jour : version source, nouvelle route et référence publique. |
| CHANGELOG.md | Entrée 2.1.13 ajoutée ; anciennes entrées préservées. |
| openspec/config.yaml | Inchangé : schéma spec-driven existant suffisant. |
| openspec/specs/ | Trois capacités couvertes par les deltas validés, synchronisées à l’archivage. |
| Skill et commande CAB | Lien et consignes de la restitution sans effet ; alias CABU/cab et versions concordantes. |
| references/concurrent-runs.md | Inchangé : décrit la restitution ordinaire ; concordance intégrale embarquée conservée. Nouvelle exception dans references/unused-test-reservations.md. |
| ORCHESTRATED_CODING.md et template | Aucun écrit : protocole CAB inchangé au hash ci-dessus ; template hors périmètre. |

## Archivage, publications et activation

Éligibilité établie sur les vérifications ci-dessus. Résultat d’archivage et validations après synchronisation consignés après leur exécution. Le rapport STATISTICS.md contient seulement les mesures disponibles. Les SHA, tag et publications sont vérifiés séparément dans le bilan final ; ils ne prouvent aucune activation. Aucune maintenance CABU ni libération de réservation réelle dans ce cycle.

Archivage effectivement réussi : 2026-10-29-release-unused-test-reservations ; +6 exigences et ~1 synchronisées. Avertissement non bloquant de l’outil : titres français de la proposition au lieu des titres conventionnels Why/What Changes ; les deltas et validations strictes restent valides. Aucun BLOCKER.md/BLOCKERS.md dans cette archive, aucun nettoyage nécessaire.

Le premier strict global après synchronisation a détecté le paragraphe MODIFIED trop long (>500 caractères), non signalé sur le delta. La formulation a été condensée à garanties et scénarios conservés, identiquement dans le delta de cette archive et la spécification courante ; aucun second archivage. Les contrôles standard/strict et de concordance sont réexécutés après cette correction rédactionnelle.

Contrôles finaux après archivage et correction rédactionnelle : OpenSpec standard16/16 et strict16/16 ; les sept blocs d’exigences du delta correspondent exactement aux spécifications courantes. Hashes du code et des tests stables depuis les suites réussies ; liens provisoires vers l’archive vérifiés.
