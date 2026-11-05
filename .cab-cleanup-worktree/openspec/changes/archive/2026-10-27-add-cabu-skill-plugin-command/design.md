# Design

## Context

La marketplace contient `cab-approval-bridge`, dont le manifeste charge les skills sous `plugins/cab-approval-bridge/skills/`. Le fichier source `.codex/commands/CABU.md` est distribué comme commande d'alias et délègue à `CAB.md`; la procédure d'update reste dans le plugin CAB et dans `/CAB update`.

## Goals / Non-Goals

**Goals:**

- Ajouter un plugin `cabu` installable indépendamment depuis la marketplace du dépôt.
- Fournir un skill Agent Skills `cabu` qui sert d'entrée directe vers la procédure existante `/CAB update`.
- Garder la commande source `/CABU` séparée et aligner les trois briques CAB/CABU sur `1.10.11`.

**Non-Goals:**

- Dupliquer ou déplacer la logique d'update hors du plugin CAB et de `/CAB update`.
- Installer, activer ou modifier les plugins, commandes, caches, services ou sessions déjà présents dans un profil utilisateur.
- Ajouter une nouvelle logique métier au broker ou aux RUN.

## Decisions

### Plugin CABU séparé avec dépendance explicite

Créer `plugins/cabu/` avec `.codex-plugin/plugin.json` et `skills/cabu/SKILL.md`, puis l'ajouter à `.agents/plugins/marketplace.json`. Le nom machine reste `cabu`, conforme au format Agent Skills ; l'interface présente CABU. Le skill exécute la commande canonique `/CAB update` et s'arrête avec une cause explicite si la commande CAB compatible n'est pas disponible. L'alternative d'une copie de toute la procédure dans le plugin CABU est rejetée pour éviter deux procédures de maintenance qui pourraient diverger.

### Commande conservée comme entrée indépendante

Garder `.codex/commands/CABU.md` et son contrat sans argument. Il reste un alias de `/CAB update` et n'embarque pas de logique dupliquée. Les distributions du plugin et de la commande sont validées par les tests du dépôt ; le plugin marketplace ne remplace pas le fichier de commande.

### Incrément commun

Incrémenter la version source commune de `1.10.10` à `1.10.11` pour les artefacts de la release courante et attribuer au plugin CABU cette même base. Conserver les occurrences historiques utilisées pour vérifier les anciennes versions. Générer un cachebuster de manifeste propre à la release selon la convention existante.

## Risks / Trade-offs

- [Le plugin CABU peut être installé sans `cab-approval-bridge`] → Le skill vérifie que `/CAB update` est disponible avant toute action et explique la dépendance sans maintenance partielle.
- [La base versionnée est répétée dans plusieurs artefacts et tests] → Ajouter un contrôle ciblé de cohérence sur les manifests, la marketplace, les commandes et la skill; garder explicites les tests des releases historiques.
- [Le fichier de commande n'est pas installé par l'entrée marketplace] → Documenter et tester séparément sa distribution par les commandes CAB existantes ; ne pas prétendre que l'installation du plugin seule enregistre la commande.

## Migration Plan

Publier les sources du plugin CABU et la commande CABU ensemble à la version `1.10.11`. Aucun état utilisateur n'est migré. Pour revenir en arrière, retirer l'entrée `cabu` du catalogue et la copie de la commande selon le mécanisme existant ; les composants installés et services actifs restent inchangés par cette préparation source.
