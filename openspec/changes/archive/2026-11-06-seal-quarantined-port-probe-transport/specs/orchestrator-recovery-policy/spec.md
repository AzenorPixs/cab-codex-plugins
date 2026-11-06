## ADDED Requirements

### Requirement: Sonde quarantinée livrée par carrier scellé
Le contrôleur SHALL préparer le payload du seul générateur qualifié de sonde
et lier son carrier au nonce/opération future, à l’opération historique, au
SID courant, à la génération et au seul port en lecture. Tout payload libre,
stage ambigu ou liaison divergente SHALL être refusé. Stage seul MUST NOT
valoir décision, accès ou once.

#### Scenario: Deux mandats de sonde sans recopie du corps
- **WHEN** le propriétaire prépare deux stages exacts et approuve chaque lanceur avec ses identités et ressources
- **THEN** chaque once ne délivre que son corps scellé et la réconciliation vérifie les deux calls distincts et les mêmes protections

#### Scenario: Lanceur ou payload d’une autre opération
- **WHEN** un stage, une identité ou une ressource ne correspond pas au permit du générateur
- **THEN** aucune admission spéciale ni délivrance du payload n’est accordée

### Requirement: Capacité bornée du carrier sans purge implicite
Le registre de stages SHALL accepter jusqu’à512entrées avec le plafond global
16Mio et64Kio par corps inchangés. Dépasser un plafond SHALL refuser sans
mutation ni purge. Les entrées existantes SHALL rester lisibles et intactes.

#### Scenario: Registre historique au plafond128
- **WHEN** de nouvelles sondes scellées sont préparées dans un registre de128stages
- **THEN** elles peuvent être ajoutées dans les bornes512/16Mio sans retirer les preuves précédentes
