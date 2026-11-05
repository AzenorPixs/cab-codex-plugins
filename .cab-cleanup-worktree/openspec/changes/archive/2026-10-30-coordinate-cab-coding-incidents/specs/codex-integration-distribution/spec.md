## ADDED Requirements

### Requirement: Point de coordination des incidents de codage CAB
Le plugin, le skill et la commande CAB MUST distribuer une même procédure de signalement des problèmes de codage CAB au chat « Correctif CAB - OC ». L’orchestrateur MUST rechercher et réutiliser ce chat, le créer seulement après absence vérifiée, éviter les doublons et conserver les mandats propres au RUN. La procédure MUST traiter cible courante, ambiguïté et outil indisponible sans auto-message ni prétendre à un envoi réalisé.

#### Scenario: Chat existant
- **WHEN** une session rencontre un problème CAB et le chat correspondant est identifié
- **THEN** l’orchestrateur le réutilise et transmet un signalement factuel filtré, sans créer de doublon ni coder en dur une identité de chat

#### Scenario: Chat absent
- **WHEN** la recherche complète accessible ne trouve pas ce chat
- **THEN** l’orchestrateur le crée dans le contexte CAB avec le signalement, puis conserve son identité pour le suivi

#### Scenario: Chat courant ou cible ambiguë
- **WHEN** le chat courant est déjà la cible ou plusieurs résultats restent ambigus
- **THEN** il consigne directement l’incident dans le premier cas et signale l’ambiguïté dans le second, sans auto-message ni diffusion multiple ; un outil indisponible reste déclaré comme tel

### Requirement: Suivi d’incident jusqu’à activation vérifiée
L’orchestrateur MUST maintenir la coordination jusqu’au correctif qualifié et à son activation CABU vérifiée, puis informer les sessions concernées. Les signalements MUST être factuels, corrélés et filtrés sans secret ni source métier inutile. Les propriétaires MUST conserver RUN, job, session, checkpoint et permissions. Une source publiée MUST NOT être annoncée active ; un blocage MUST conserver preuves et conditions de reprise sans rejeu de décision ou once.

#### Scenario: Source publiée mais activation en attente
- **WHEN** le correctif est qualifié et publié sans preuve CABU terminale
- **THEN** l’incident reste suivi et la version n’est pas déclarée effective

#### Scenario: Activation confirmée
- **WHEN** CABU termine avec les versions réellement actives et la readiness vérifiées
- **THEN** les sessions concernées sont informées de la correction et de la preuve d’activation, avant reprise autorisée

#### Scenario: Échec de mise à jour
- **WHEN** CABU échoue ou une dépendance empêche la suite
- **THEN** l’incident conserve son état, ses preuves et ses conditions de reprise, sans rejeu de décision ou once
