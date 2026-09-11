## Context

Les capacités CAB sont implémentées mais ne possèdent pas encore de spécifications de référence. Les documents décrivent une arborescence de plugin différente des sources et le contrôleur local est tronqué à l'intérieur de son gestionnaire HTTP.

## Goals / Non-Goals

**Goals:**

- Établir cinq contrats OpenSpec correspondant aux capacités déjà observables.
- Aligner la structure du plugin sur son manifeste Codex et sur la documentation.
- Restaurer le contrat HTTP minimal du contrôleur sans changer l'architecture de transport.

**Non-Goals:**

- Ajouter un transport MCP réseau, une dépendance tierce, un paquet système ou une image conteneur.
- Publier ou installer le plugin dans un marketplace externe.

## Decisions

### Arborescence `codex/plugin`

Le plugin reste dans `codex/plugin/`, emplacement déjà annoncé par le cadrage. Son manifeste est déplacé vers `.codex-plugin/plugin.json` et les scripts vers `scripts/`, conformément à la structure validée par Codex. Conserver `plugins/sccripts` aurait maintenu une faute de chemin et une divergence documentaire.

### Réparation minimale du contrôleur

La branche `POST /decision/<requestId>` est complétée avec une réponse HTTP 201, la gestion 400 des entrées invalides, 405 pour une méthode non admise et 404 pour une route inconnue. Le serveur démarre ensuite Codex et la supervision SSE après son écoute locale. Cette solution rétablit le contrat documenté sans refactorer les décisions ou les transports existants.

### Spécifications de référence par capacité

Les spécifications sont séparées par contrat observable : workflow, persistance, contrôleur, supervision et intégration. Cette séparation évite de dupliquer les détails d'implémentation dans la documentation de cadrage.

## Risks / Trade-offs

- [Un marketplace local n'est pas encore un canal de publication validé] → le documente comme catalogue interne à valider avant diffusion.
- [Le snapshot ne contient pas de tests automatisés] → appliquer des contrôles de syntaxe, de manifeste et de validation OpenSpec ; ajouter des tests reste un travail futur distinct.
- [La racine `/workspace` peut désigner un montage conteneur] → documenter les deux contextes plutôt que de supposer qu'un seul chemin est universel.

## Migration Plan

1. Déplacer les fichiers du plugin sans modifier leur contenu fonctionnel.
2. Compléter le contrôleur et valider la syntaxe Node.js.
3. Créer, valider puis archiver le changement OpenSpec pour installer les spécifications de référence.
4. Mettre à jour les documents vers les chemins et versions retenus.

Le rollback consiste à restaurer les anciens chemins et à retirer le changement OpenSpec avant son archivage ; aucune donnée runtime n'est migrée.
