## ADDED Requirements

### Requirement: Coordination CCAB entre projets
Le déclarant et le correcteur CCAB désigné par le développeur MAY échanger les seules identités et preuves nécessaires au traitement d'un incident déclaré, même lorsque leurs chats sont rattachés à des projets différents. Le développeur a explicitement autorisé cette coordination. Les participants SHALL vérifier l'identité et le rôle du destinataire et les permissions techniques applicables ; ils SHALL NOT transmettre de secret ni étendre un mandat métier par ce seul échange.

#### Scenario: Correcteur CAB et déclarant d'un autre projet
- **WHEN** une session a déclaré un incident CCAB et que le correcteur désigné demande les preuves nécessaires
- **THEN** elle peut communiquer ces preuves sans redemander au développeur une approbation pour chaque échange
- **AND** les permissions de la plateforme et les frontières du change restent applicables
