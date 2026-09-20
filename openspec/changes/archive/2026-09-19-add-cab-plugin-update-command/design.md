## Context

Les plugins Codex sont installés depuis une marketplace configurée. CAB est
distribué sous le nom `cab-approval-bridge` dans la marketplace
`cab_codex_plugins`. La copie installée peut différer de la version publiée.

## Goals

- Vérifier explicitement les versions avant toute actualisation.
- Ne déclencher l'actualisation native Codex qu'en présence d'une version plus
  récente.
- Préserver le broker, OpenCode, le contrôleur, le SSE et les sessions CAB.

## Non-Goals

- Modifier la configuration Codex ou le catalogue marketplace.
- Gérer l'installation initiale d'un plugin absent.
- Actualiser plusieurs plugins ou marketplaces.

## Decisions

La comparaison porte sur la version SemVer de base ; le suffixe de cachebuster
Codex introduit par `+` n'influence pas l'ordre des versions. La commande
refuse les versions absentes ou invalides. Après une actualisation, elle relit
les métadonnées installées avant d'annoncer le succès.

## Risks and Rollback

La mise à niveau est déléguée au mécanisme Codex officiel. En cas d'échec ou de
version inattendue, `/cab update` signale l'erreur sans modifier elle-même les
fichiers du plugin, du marketplace ou du projet.
