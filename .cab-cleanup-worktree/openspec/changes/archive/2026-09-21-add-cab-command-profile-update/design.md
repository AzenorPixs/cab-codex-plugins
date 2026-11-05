## Context

La commande `/cab` installée dans le profil Codex n'appartient pas à la cache
du plugin marketplace. Elle doit donc être actualisée séparément depuis sa
source GitHub définie par le développeur :
`https://github.com/AzenorPixs/cab-codex-plugins`, branche `main`, chemin
`.codex/commands/cab.md`.

## Decisions

La commande utilise le champ `version` de son frontmatter YAML et applique les
règles SemVer. Un fichier distant est téléchargé dans un emplacement temporaire
du profil, validé avant toute écriture, puis déplacé atomiquement vers la cible
locale seulement s'il est strictement plus récent. Une copie locale sans
version est une installation héritée et peut être remplacée par une copie
distante valide.

Le marketplace CAB doit être une source Git configurée depuis
`AzenorPixs/cab-codex-plugins`, branche `main`, avec une extraction sparse de
`.agents/plugins` et `plugins`. Si une source locale homonyme existe, `/cab update` la
remplace seulement après avoir mémorisé sa racine et la restaure si l'ajout Git
échoue. Après actualisation de l'instantané Git, la commande réinstalle le
plugin avec `codex plugin add` uniquement si le manifeste distant est plus
récent.

## Non-Goals

- Modifier le dépôt GitHub.
- Mettre à jour des commandes autres que `/cab`.
- Écraser une commande locale égale, plus récente ou dont la source distante
  est invalide.

## Risks and Rollback

Un échec réseau, une redirection d'hôte, un téléchargement ou un frontmatter
invalide interrompt seulement l'actualisation de la commande et préserve la
copie existante. Le remplacement atomique évite toute copie locale partielle.
Un échec de migration restaure la marketplace locale mémorisée avant de
signaler l'erreur.
