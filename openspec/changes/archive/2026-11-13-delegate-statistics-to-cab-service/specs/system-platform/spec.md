## ADDED Requirements

### Requirement: Statistiques de change prises en charge par CAB
Les rapports locaux STATISTICS.md des changes MUST rester la seule source de
vérité. CAB MUST les projeter dans PostgreSQL, avec historique et métriques
complètes sans inventer de valeur absente. CAB MUST gérer les générations de fin
et les globaux sans rédaction LLM ; le prompt SGS autonome MUST être retiré.

#### Scenario: Édition locale
- **WHEN** un change ou ses statistiques sont modifiés localement
- **THEN** la projection PG est synchronisée rapidement dans le sens local vers base, avec rattrapage quotidien aléatoire au plus24h pour toutes les sources

#### Scenario: Fin de change et global absent
- **WHEN** un change est archivé ou l’inventaire des sources est complet sans global
- **THEN** CAB génère ou amende ses rapports et le global automatiquement, conserve les sources manuelles et signale les lacunes sans dépendre du LLM

#### Scenario: Exclusion mutuelle et migration
- **WHEN** des opérations statistiques concurrentes sont demandées
- **THEN** CAB les sérialise dans PostgreSQL, conserve les effets incertains protégés et ne crée aucun verrou fichier ni moteur autonome contournant CAB

#### Scenario: Change ouvert sans codage
- **WHEN** un change ouvert n’a encore accueilli aucune session de codage
- **THEN** l’absence de STATISTICS.md est normale, aucun fichier individuel n’est créé et cet état ne constitue pas une lacune statistique
