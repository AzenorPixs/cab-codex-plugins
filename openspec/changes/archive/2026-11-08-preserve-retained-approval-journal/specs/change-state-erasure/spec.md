## ADDED Requirements

### Requirement: Cohérence des approbations conservées et de leur journal

CAB MUST conserver les événements d’une approbation conservée, même si une
autre approbation ciblée partage son identifiant. La projection MUST préserver
les pairs et MUST NOT rejouer une décision métier.

#### Scenario: Identifiant partagé entre projets
- **WHEN** une approbation non ciblée et une approbation ciblée partagent un identifiant
- **THEN** CAB conserve l’approbation non ciblée et les événements nécessaires à sa cohérence

### Requirement: Reconstruction explicitement identifiée

Si des événements ont déjà été perdus et que le magasin fait autorité pour une
réconciliation non ambiguë, CAB MAY produire des marqueurs reconstruits à partir
du magasin. CAB MUST identifier leur provenance et MUST NOT les présenter comme
les événements ou les horodatages originaux ni rejouer de décision.

#### Scenario: Événements originaux indisponibles
- **WHEN** les seules preuves restantes sont celles du magasin conservé
- **THEN** la réconciliation distingue les marqueurs reconstruits des événements originaux

### Requirement: Reprise d'un reçu propriétaire appliqué après redémarrage des services

CAB MAY réconcilier les PID de services d’un reçu STOPPING déjà appliqué par
son propriétaire après vérification du même périmètre, du même propriétaire,
des RUN protégés et d’un broker corrigé. Les valeurs sentinelles `null` et
`undefined` MUST NOT être considérées comme des identités manquantes.
Le profil helper et broker 2.4.39 avec services 2.4.35 MAY reprendre le reçu
précédemment lié au helper 2.4.38, puis CABU MUST aligner les briques.

#### Scenario: Portée effective sans sentinelle
- **WHEN** la seule différence de portée est une sentinelle qui n’est pas une identité
- **THEN** CAB ne refuse pas la reprise pour cette différence

#### Scenario: Nouvelle identité réelle manquante
- **WHEN** une identité réelle du périmètre initial manque dans la portée effective
- **THEN** CAB refuse la reprise et conserve le reçu

#### Scenario: Projection refusée après arrêt
- **WHEN** une projection est refusée avant application côté contrôleur après que le propriétaire a terminé
- **THEN** CAB remet les services disponibles pour les autres RUN et conserve le reçu pour une reprise ciblée
