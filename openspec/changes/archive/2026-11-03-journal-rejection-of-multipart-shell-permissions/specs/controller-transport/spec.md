## ADDED Requirements

### Requirement: Refuser une cible shell non admissible sans autoriser son exécution
Le client CAB SHALL pouvoir journaliser le rejet d’une permission shell dont
l’identité native exacte est vérifiée, même si ses ressources ne passent pas
la garde d’exécution. Le chemin reject SHALL conserver INTENT avant POST,
ACK204 après contrôle du processus et interdiction de rejouer une issue
incertaine. Les gardes de once SHALL rester inchangées.

#### Scenario: Une permission native et trois ressources shell
- **GIVEN** un workspace, SID, permissionId et call natif exacts avec trois ressources shell
- **WHEN** le propriétaire demande reject
- **THEN** le client journalise son refus sans once ni décision de mandat inventée

#### Scenario: Identité divergente ou réponse perdue
- **GIVEN** une source étrangère/ambiguë, un PID changé ou une réponse native perdue
- **WHEN** le rejet ou sa reprise est demandé
- **THEN** aucun POST n’est fait sur une identité divergente et une intention incertaine n’est pas rejouée
