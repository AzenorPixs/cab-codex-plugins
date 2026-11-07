## ADDED Requirements

### Requirement: Retrait délégué avant émission native
La policy propriétaire MAY permettre release-access RECONCILED pour un parent HELD dont les membres sont terminaux ou PREPARED sans entrée native/nativeResult. Mandat clos, SID quiescent, zéro permission et gardes ordinaires SHALL rester exigés. Le token SHALL être traité uniquement en interne, jamais fourni ou retourné dans une sortie publique.

#### Scenario: Token d’un accès non commencé exposé
- **WHEN** le propriétaire décide le retrait après qualification de la frontière
- **THEN** il obtient la clôture par la route existante sans nouvelle once ; un accès restauré est d’abord réconcilié

### Requirement: Réconciliation sans auto-blocage des préparations non émises
La réconciliation d’un accès restauré SHALL ignorer uniquement les demandes enregistrées du même RUN/contexte, APPROVED sans native, nativeResult ni once. Tout mandat ouvert, demande indécise, réconciliation, permission non appariée ou effet inconnu SHALL bloquer. Deux frontières natives stables, identité, empreinte et fencing SHALL rester exigés ; aucune demande n’est exécutée ni décision modifiée.

#### Scenario: Accès restauré avec sa propre préparation approuvée
- **WHEN** l’accès est réconcilié et les seules préparations restantes sont enregistrées, approuvées et non émises dans le même contexte
- **THEN** la qualification native peut aboutir sans nouvelle permission ni once et sans ignorer une demande étrangère ou indécise
