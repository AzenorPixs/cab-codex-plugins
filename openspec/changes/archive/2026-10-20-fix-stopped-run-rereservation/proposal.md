# Reprise d'un RUN après arrêt et libération

## Why

Après STOP puis libération réconciliée, la réservation est ABANDONED mais conserve son marqueur d'arrêt. Le contrôle d'admission le traite encore comme actif et refuse une nouvelle réservation du même RUN avec `run-stop`. Après redémarrage, RESUME ne peut pas lever ce marqueur car seuls les contextes réservés sont chargés.

## What Changes

- Limiter les suspensions de réservation à leur génération active ; une nouvelle réservation après clôture conserve l'historique sans hériter du STOP précédent.
- Préserver contrôles de propriétaire, génération, dépendances, accès non résolus, gels globaux et permissions unitaires.
- Couvrir la reprise par des régressions registre et HTTP, y compris après redémarrage.
- Aligner les briques distribuées sur 1.6.4 en conservant la préparation monitoring 1.6.3.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `concurrent-run-coordination` : nouvelle réservation d'un RUN libéré avec génération neuve, sans propagation d'une suspension historique.

## Impact

Correctif de `ResourceRunRegistry.reserve`, tests ciblés, versions et documentation de distribution. Aucun changement de schéma, de dépendance, de décision ou de protocole ask/once. Aucun commit, push, tag ou publication Git. Les archives précédentes restent inchangées. L'installation et l'activation runtime sont distinctes de la validation source SCM.
