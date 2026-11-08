## ADDED Requirements

### Requirement: Nettoyage SGS indépendant après redémarrage

Une session native non vérifiée dans un RUN réservé MUST NOT bloquer le nettoyage SGS d’un autre change clos. Le contrôleur MUST vérifier l’identité native, MUST conserver les protections de la session historique et MUST refuser le nettoyage si un RUN du change ciblé est réservé.

#### Scenario: RUN non vérifié d’un autre change
- **WHEN** un autre RUN possède une session native non vérifiée et que le change cible est clos
- **THEN** le contrôleur peut engager le nettoyage SGS sous verrou du change cible

#### Scenario: RUN actif du change cible
- **WHEN** le change cible possède un RUN réservé
- **THEN** le contrôleur refuse le nettoyage SGS et préserve les données
