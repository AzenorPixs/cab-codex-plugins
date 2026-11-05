## ADDED Requirements

### Requirement: Lecture native durable bornée

Le contrôleur MUST offrir une lecture interne du journal V2 de la session liée
au RUN en mode `follow=false`, avec réponse bornée, filtrée localement par
sessionID et callID, et exiger `log.synced` avant de qualifier la couverture.
Le contenu du journal MUST NOT être exposé dans les réponses publiques ou les
journaux CAB.

#### Scenario: Journal complet au watermark

- **WHEN** une lecture scoppée atteint `log.synced` et contient un seul résultat
  terminal correspondant au callID
- **THEN** CAB persiste la frontière exacte dans le ledger du RUN

#### Scenario: Journal incomplet ou trop volumineux

- **WHEN** le flux est tronqué, dépasse sa limite, manque de watermark ou
  comporte des événements divergents
- **THEN** CAB refuse la classification et conserve l’opération `UNKNOWN`
