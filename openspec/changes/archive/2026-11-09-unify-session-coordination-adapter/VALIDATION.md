# Validation — 9 novembre 2026

## Périmètre observé

- 72 tests Python : découverte sans effet, quatre couples de modes par la CLI réelle, persistance, preuve, déduplication, pause/reprise, isolation et réconciliation.
- 21 tests Node : distribution, clôture directe et gates ; un routeur dépassant 4 000 octets a été réduit, sans changer le contrôle.
- 4 scénarios contrôleur : notifications directe et pilotée, pause ciblée/globale et refus de désarmement d'un avis incertain, avec transports natifs factices.
- Scénario updater : déploiement isolé complet puis deuxième invocation sans nouvelle coupure.
- Validation OpenSpec stricte globale et vérification du contrat distribué exécutées.

La CLI passive réelle ne prouve pas un envoi natif. Les transports contrôlés
ne prouvent pas l'adoption d'un prompt par un agent utilisateur. Aucun message
n'a été envoyé à une session de travail pour qualifier ce raccordement.

## Revue documentaire

| Source | État et motif |
| --- | --- |
| AGENTS.md | Inchangé ; autorisations et racine propres à cab conservées. |
| PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md | Amendés pour l'adaptateur technique et les limites de qualification. |
| DEVOPS.md | Inchangé ; outils et référentiel prompts relus. |
| DEVELOPMENT_MAP.md, openspec/BATCH_CODES.md | Maintenance ciblée, code non attribué, sans reconstruction ACL. |
| Références CAB | Adaptateur commun, boîte et politique du parent harmonisés ; commandes métier conservées dans prompts. |
| Contrat public et manifests | Régénération et cohérence de version cab 2.5.2 vérifiées. |

Le suivi direct a renvoyé `queued` et un moniteur de version incompatible :
aucune couverture native complète n'est déduite. Le rapport individuel et
la vérification après CABU restent distincts de ces validations source.
