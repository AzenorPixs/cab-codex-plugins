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

## Non-Goals

- Modifier le dépôt GitHub, le marketplace ou la configuration Codex.
- Mettre à jour des commandes autres que `/cab`.
- Écraser une commande locale égale, plus récente ou dont la source distante
  est invalide.

## Risks and Rollback

Un échec réseau, une redirection d'hôte, un téléchargement ou un frontmatter
invalide interrompt seulement l'actualisation de la commande et préserve la
copie existante. Le remplacement atomique évite toute copie locale partielle.
