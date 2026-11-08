## ADDED Requirements

### Requirement: Sentinelles exclues de l'effacement unitaire

CAB MUST exclure les chaînes sentinelles `null` et `undefined` des identités propagées dans toute portée d'effacement unitaire et de lot. Les vraies identités étrangères et les protections des RUN pairs MUST rester contrôlées.

#### Scenario: Sentinelle commune à plusieurs RUN
- **WHEN** des opérations de RUN différents portent la même valeur sentinelle
- **THEN** cette valeur ne crée ni appartenance ni refus de référence étrangère

#### Scenario: Véritable identité étrangère
- **WHEN** une identité réelle relie un objet protégé à un objet cible
- **THEN** les protections existantes s'appliquent et la référence ne devient pas effaçable
