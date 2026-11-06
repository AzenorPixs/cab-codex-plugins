## ADDED Requirements

### Requirement: Effacement multi-propriétaire sous inventaire revu
CAB SHALL fournir un prévol sans effacement du seul change avec les tuples RUN/contexte/version/propriétaire et leur empreinte canonique. Le propriétaire de clôture MAY préparer un nettoyage multi-propriétaire uniquement sous revue explicite de l’inventaire complet et références du mandat déjà autorisé. Le défaut SHALL continuer à refuser un propriétaire étranger. CAB SHALL revalider les liaisons à prepare et seal sans réécrire les propriétaires historiques.

#### Scenario: Ancien RUN temporaire du même change
- **WHEN** tous les RUN inclus sont libérés, le dernier contexte appartient au propriétaire de clôture avec gate final validé et job désarmé, et les anciens jobs sont désarmés sans effet ou ressource non soldé
- **THEN** la revue exacte permet l’inventaire des sessions de tous ces RUN et le cycle OC puis CAB, sans gate fictif historique et sans toucher aux pairs

#### Scenario: Inventaire ou attribution divergent
- **WHEN** une liaison manque, est dupliquée ou change, un autre change partage le RUN, un job est armé ou un effet reste non réconcilié
- **THEN** CAB refuse la préparation ou le scellement avant effacement et préserve les états et propriétaires
