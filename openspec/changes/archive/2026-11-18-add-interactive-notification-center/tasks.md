## Réalisation
- [x] Persister messages, questions, lectures et reçus de réponse dans PostgreSQL.
- [x] Exposer les opérations CAB authentifiées et le flux Electric privé.
- [x] Ajouter la cloche globale, l'overview, les flèches et les réponses.
- [x] Retirer les logs de livraison du bloc Git et publier leurs notifications.
- [x] Utiliser le nom du change pour le message du commit final.
- [x] Confier le choix de version au codeur direct ou à l'orchestrateur en piloté, avec contrôle service et protocole distribué.
## Validation et livraison
- [x] Contrôles ciblés backend, build frontend et vérifications navigateur sur l'hôte.
- [x] Reporter les changements validés dans le projet et valider OpenSpec.
- [x] Préparer l'archive et la livraison SCM/CI/CD CAB (reçus de livraison et d'installation distincts).

Preuves du 18 novembre 2026 : 17 contrôles ciblés réussis lors du passage PG
réel (rollback intégral), build TypeScript/Vite réussi ; parcours Chromium sur
l'hôte validé en 390, 1920 et 3840 pixels. Sauvegarde hôte avant migration 0038.
Le contrôle CAB `notifications-host-check-01` a réussi avant l'extension du
protocole de version (10 tests, 3 scénarios PG
ignorés dans ce passage non privilégié ; ces 3 scénarios sont validés par le
passage PG réel distinct). Aucune installation ni publication n'est déduite de
ces contrôles ; leurs reçus seront suivis dans le RUN de livraison.

La sélection 3.2.18 est exercée par le codeur direct selon le mandat du
développeur, sans demande d'un numéro. Le protocole impose l'orchestrateur dans
un RUN piloté et le service refuse les versions non déclarées par celui-ci.

L'archive et ses cinq deltas ont été validés en mode strict sans avertissement
par le validateur OpenSpec installé. La validation stricte de la spécification
globale reste non concluante à cause de quatre avertissements de longueur
préexistants (exigences 59, 69, 70 et 78), conservés hors périmètre.
