## Decisions

Le résumé est toujours affiché, même si une étape d'actualisation échoue. Les
versions GitHub sont lues dans les fichiers publiés. Les versions locales du
plugin et du contrôleur sont lues dans le cache effectivement installé. La
version locale du broker est fournie exclusivement par
`broker_readiness.server_version`, afin de représenter le broker réellement
actif. Toute information indisponible reste explicitement `INDISPONIBLE`.

## Non-Goals

- Déduire une version locale depuis les sources du projet.
- Masquer une source de version inaccessible.
