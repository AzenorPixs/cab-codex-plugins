## ADDED Requirements

### Requirement: Nettoyage terminal simple et indépendant par brique

CAB MUST proposer une opération unique de nettoyage ciblé d’un projet et de
RUN ou changes terminaux. Elle MUST refuser une cible active et préserver les
RUN, projets, décisions actives et fichiers métier étrangers. Elle MUST réaliser
les suppressions possibles sans attendre une brique indisponible, puis reprendre
uniquement les suppressions restantes sans rejouer d’effet métier.

#### Scenario: Cible terminale et pair actif
- **WHEN** le développeur demande le nettoyage d’un RUN terminal et qu’un pair est actif
- **THEN** CAB retire les données ciblées sans interrompre ni modifier le pair

#### Scenario: Brique indisponible
- **WHEN** une brique ciblée est indisponible
- **THEN** CAB nettoie les autres briques et reprend cette seule brique lorsqu’elle répond

#### Scenario: RUN ciblé actif
- **WHEN** le RUN ciblé est en cours
- **THEN** CAB refuse sa suppression et préserve son état

#### Scenario: Reprise d’un ancien reçu
- **WHEN** une transaction historique ne peut pas achever immédiatement son nettoyage
- **THEN** CAB préserve les pairs et permet les opérations indépendantes sans verrou global durable
