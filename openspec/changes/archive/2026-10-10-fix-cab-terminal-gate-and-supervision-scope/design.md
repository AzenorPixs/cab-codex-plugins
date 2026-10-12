## Context

Le gate consulte les validations actives et une readiness broker mémorisée,
alors que le mode manuel retire immédiatement la demande du compteur actif.
Le superviseur ajoute `/status` et `/job` à l'URL configurée, tandis que le
healthcheck attend déjà un endpoint. Enfin, toute trame SSE globale actualise
actuellement lastActivityAt, même sans lien avec le job.

## Goals / Non-Goals

Corriger exclusivement CGP-20261010-05 à 07. Conserver les endpoints HTTP,
les décisions explicites et uniques, les alias OC_CGPT_, les délais et gardes
de récupération. Ne pas déployer le correctif, intervenir sur un fournisseur,
changer les versions, migrer un état ou étendre les remédiations.

## Decisions

- Le gate examine les validations locales sans décision mémorisée avant
  d'accepter un compteur broker nul. Il ne crée aucune décision.
- Chaque client résout l'URL existante en acceptant la base ou `/status`,
  avec slash final éventuel. Le superviseur retrouve la base pour `/job`.
  Aucun nouveau module ni paramètre de configuration n'est nécessaire.
- Le superviseur décode les trames SSE et identifie la session des événements
  de session, message ou permission. L'enveloppe globale peut porter directory
  et payload ; un directory fourni doit correspondre au job. Une trame de
  transport, invalide ou sans session exploitable ne vaut pas activité métier.
- L'horloge est corrélée à jobId, sessionId et directory ; un changement de
  contexte invalide l'ancienne activité. Les métadonnées publiques restent
  non secrètes. Un état ancien reste lisible sans migration.
- Les tests utilisent uniquement des serveurs et processus simulés locaux,
  des répertoires temporaires sous /tmp nettoyés et un systemctl simulé.

## Risks / Trade-offs

Le gate devient plus strict lorsqu'une demande indécise subsiste localement.
Les événements non identifiables ne repoussent plus la reprise ; les contrôles
CAB et le gel pendant récupération restent nécessaires. Les formats base et
/status documentés sont couverts, sans prétendre qualifier une intégration
OpenCode réelle. Les modifications locales sont réversibles, sans migration.

## Validation

Valider ce change en strict avant code ou tests. Exécuter ensuite les
reproductions contre les sources initiales, puis vérifier leur réussite après
correction. Contrôler syntaxe Node, suites Node/Python, OpenSpec, UTF-8/LF,
empreintes et matrice documentaire. Qualifier les avertissements globaux
préexistants sans présenter un strict échoué comme réussi. Archiver ce seul
change éligible, puis prouver son rapport à six sections sans skill de sondes.
