## ADDED Requirements

### Requirement: Travail observé et attente par étape
L’Overview MUST séparer le travail attesté du temps d’attente. CAB MUST borner les intervalles au passage d’étape et éviter de compter deux fois les chevauchements. La durée totale du cycle reste une durée écoulée. CAB MUST laisser vide toute durée dont les preuves manquent.

#### Scenario: Initialisation restée ouverte pendant la nuit
- **WHEN** aucun tour ni effet CAB observé ne couvre une partie d’un passage et que la télémétrie couvre cette période
- **THEN** CAB affecte cette partie à l’attente et la distingue du travail.

### Requirement: Horodatages de Revue et Clôture
CAB MUST utiliser les événements observés de demande et décision pour la Revue, et de début et fin pour la Clôture. CAB MUST préserver les traces historiques. Une revue non exigée MUST apparaître comme non requise si CAB ne dispose d’aucun passage.

#### Scenario: Clôture historique avec deux événements
- **WHEN** un RUN clôturé dispose d’un événement de début de finalisation et d’un reçu de clôture
- **THEN** l’Overview présente les dates observées même si aucun passage de Clôture n’a été conservé.

### Requirement: Cycle complet horodaté et suivi par Electric
CAB MUST vérifier les deux bornes de chacune des douze étapes avant de compter un cycle complet. Une étape non requise MUST être enregistrée à l’heure de la décision. Les listes de sessions, les archives et le détail du RUN MUST afficher les étapes du profil réel et se rafraîchir via Electric.

#### Scenario: Revue facultative lors d’un cycle complet
- **WHEN** CAB franchit la Revue car la politique du RUN ne l’exige pas
- **THEN** CAB enregistre la décision à cet instant et compte le passage sans temps de travail.

### Requirement: Relances d’inactivité par rôle
CAB MUST adresser un texte lisible à la session authentifiée du codeur ou de l’orchestrateur qui doit agir. Il MUST conserver le texte et la preuve de remise dans la vue du RUN. En l’absence de transport vérifiable, CAB MUST afficher le rappel dans le RUN et identifier sa remise comme non confirmée.

#### Scenario: Aucune nouvelle après trois rappels
- **WHEN** l’agent reste inactif après trois relances au premier délai
- **THEN** CAB relance une fois au deuxième délai, puis une dernière fois au troisième délai.

#### Scenario: Configuration et reprise d’activité
- **WHEN** l’administrateur ouvre Administration → Agents
- **THEN** il peut modifier chacun des trois délais, initialisés à 5 minutes, 30 minutes et 4 heures.
- **AND** une nouvelle activité réelle remet la cadence au premier délai.
