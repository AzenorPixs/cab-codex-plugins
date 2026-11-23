## MODIFIED Requirements

### Requirement: Convergence continue des connecteurs MCP
CAB MUST compter les liaisons actives par type d’agent, tous comptes confondus, avec un maximum de une. CAB MUST vérifier que le relais, le moteur et le catalogue correspondent à la version déployée. La remédiation MUST reprendre les mécanismes admissibles avec un délai et préserver les opérations protégées et les effets incertains.

#### Scenario: Détection et résolution d’un écart
- **WHEN** un agent présente au moins deux liaisons actives ou une version non attestée
- **THEN** CAB notifie le début de la remédiation et maintient la surveillance
- **AND THEN** CAB notifie le retour après observation d’une seule liaison active et de la concordance des trois versions

#### Scenario: Reprise d’un bureau au profil de partage compatible
- **WHEN** CAB observe l’identité de l’instance graphique, un profil compatible et une installation locale vérifiée
- **THEN** CAB peut reprendre cette instance sur frontière sûre au moyen du parcours CABU, sans réinstallation
- **AND THEN** le reçu n’atteste la reprise des anciennes liaisons qu’après observation de leur arrêt et de la liaison de remplacement unique à la version cible

## ADDED Requirements

### Requirement: Rattachement des RUN sur le canal MCP partagé
CAB MUST associer chaque appel lié à un RUN à la session native vérifiée transportée par le client sur la liaison partagée. Les rattachements MUST rester distincts pour chaque session native. CAB MUST refuser tout contexte absent, inconnu ou divergent dans le transport partagé.

#### Scenario: Deux RUN partagent un même canal
- **WHEN** deux sessions Codex utilisent une liaison commune
- **THEN** chaque appel lié à un RUN utilise le rattachement vérifié de sa session native
- **AND THEN** un appel sans contexte vérifié ne sélectionne aucun autre RUN
