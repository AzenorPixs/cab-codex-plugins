# project-session-dependency-coordination Specification

## Purpose
Permettre aux sessions directes et pilotées d'un même projet de déclarer leurs dépendances et d'échanger des avis durables, sans substituer ces avis aux preuves d'autorité ni modifier les protections des sessions.

## Requirements

### Requirement: Déclarations de dépendance précises et isolées
La coordination MUST identifier le projet canonique, la session, le RUN et son mode direct ou piloté. Une session MUST pouvoir déclarer des dépendances de type change, tâche ou capacité, avec un identifiant précis, un critère et, seulement s'il est attesté, un code de lot. Les déclarations MUST être isolées par projet et propriétaire. Les identités et les entrées externes MUST être validées ; une dépendance non déclarée MUST NOT être considérée satisfaite.

#### Scenario: Déclaration d'une tâche
- **WHEN** une session déclare une tâche d'un change avec son critère
- **THEN** elle peut retrouver cette déclaration sans exposer celles d'un autre projet

### Requirement: Avis durables avec preuves
Une session participante MUST pouvoir publier un avis portant une identité stable, une dépendance précise et une référence de preuve non sensible. Les avis MUST être conservés durablement pour chaque destinataire concerné et permettre un acquittement distinct. Le destinataire MUST vérifier ses critères sur les sources d'autorité ; un avis ne prouve pas une qualification, livraison ou activation.

#### Scenario: Avis pour une dépendance déclarée
- **WHEN** une session publie une preuve pour une dépendance déclarée
- **THEN** le destinataire peut consulter cet avis et vérifier ses propres critères

### Requirement: Publication idempotente
Une répétition identique MUST NOT créer de doublon ; une identité réutilisée avec un contenu divergent MUST être refusée. Une erreur ou une indisponibilité MUST NOT être présentée comme une livraison.

#### Scenario: Publication répétée
- **WHEN** un même avis est publié deux fois avec le même contenu
- **THEN** chaque destinataire concerné ne reçoit qu'un seul avis

#### Scenario: Service indisponible
- **WHEN** une publication ne peut pas être durablement enregistrée
- **THEN** elle échoue explicitement et ne prétend pas avoir averti ses destinataires

### Requirement: Pause et clôture restent explicites
Un avis MUST NOT lever une pause, relancer un travail ou consommer une permission. Les avis des sessions en pause MUST rester consultables sans reprise automatique. Un arrêt autorisé MUST respecter les contrats de désarmement et de rapports ; le change inachevé reste ouvert.

#### Scenario: Avis pendant une pause
- **WHEN** une dépendance déclarée reçoit un avis pendant une pause explicite
- **THEN** l'avis est conservé et la session reste en pause

### Requirement: Poursuite des dépendances SCM
Une session SCM MUST poursuivre la réalisation des dépendances nécessaires dans son mandat et préparer toute extension requise pour validation explicite ; elle MUST NOT être mise en pause du seul fait d'une dépendance. Pour les autres mandats concernés, lorsque leurs travaux indépendants sont épuisés, le choix entre pause et arrêt ciblé MUST être explicite et MUST NOT arrêter un autre RUN.

#### Scenario: Dépendance à réaliser par SCM
- **WHEN** une dépendance nécessaire n'est pas encore réalisée
- **THEN** la session SCM poursuit les travaux autorisés et soumet l'extension nécessaire lorsqu'elle sort de son mandat

### Requirement: Confidentialité et frontière de transport
Les données persistées et échangées MUST être limitées aux identités, critères et références nécessaires, sans secrets ni transcription de session. Les données MUST être protégées par les contrôles d'accès locaux applicables. La disponibilité de la boîte MUST NOT être présentée comme une preuve que le canal natif d'une session a reçu un message. Les capacités et limites du transport MUST être documentées.

#### Scenario: Canal natif indisponible
- **WHEN** aucun canal natif qualifié ne peut notifier une session
- **THEN** l'avis reste disponible dans sa boîte et l'absence de notification native est signalée
