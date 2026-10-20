# Limite configurable des commandes du contrôleur CAB

## Why

Le contrôleur refuse actuellement les commandes de plus de 2 000 unités UTF-16 avec un HTTP 400 vide. Cette constante bloque des mandats unitaires légitimes et ne permet pas de diagnostiquer leur longueur excessive.

## What Changes

- Configurer la limite au démarrage avec `OC_Codex_MAX_COMMAND_LENGTH`, alias `OC_CGPT_MAX_COMMAND_LENGTH`, et une valeur par défaut de 16 384.
- Refuser explicitement les configurations invalides et les commandes trop longues, sans exposer leur contenu.
- Contrôler les demandes et rappels avant tout enregistrement d'opération ou de validation, y compris les routes par RUN et resource.
- Conserver un diagnostic filtré dans la trace d'échec de notification du broker, sans créer de décision.
- Vérifier les bornes, Unicode, la configuration et l'invariant commande exacte / décision corrélée / permission native once unique.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `controller-transport` : limite configurable, refus HTTP explicite et invariants de permission préservés.
- `approval-workflow` : diagnostic filtré d'échec de notification, distinct d'une décision de rejet.

- Versionnement et références : `codex-integration-distribution`, `concurrent-run-coordination` et `native-session-statistics`, alignés sur 1.4.0.

## Impact

Contrôleur, contexte de job, notification broker, suites de configuration/corrélation et documentation. Aucune dépendance, migration, installation ou publication. Les limites de transport restent indépendantes. Configurer 2 000 rétablit le seuil précédent. Le cycle de notification et les règles de corrélation existantes restent inchangés.

## Version de livraison

Toutes les briques CAB passent de 1.3.0 à 1.4.0, avec un cachebuster Codex neuf. Les versions courantes des sources, commande, manifeste, unités, skills, tests et cadrages sont alignées. Les historiques du changelog et des archives restent inchangés. Le seul bloc de concurrence de ORCHESTRATED_CODING.md est synchronisé avec la référence distribuée. Cette préparation source ne déploie rien et ne change aucun schéma de données ni identifiant de protocole.

## Garde de consommation

Le polling d’une opération déjà consommée peut réinscrire sa session après une réconciliation historique. La garde de transmitApprovedOperation vérifie consommation et invalidation avant l’admission susceptible de modifier le registre. Un test attend plusieurs sondages après réconciliation pour prouver l’absence de réinscription et de seconde permission. La fixture de supervision conserve ses assertions et dispose de cinq secondes au lieu de deux secondes et demie pour observer la première émission.
