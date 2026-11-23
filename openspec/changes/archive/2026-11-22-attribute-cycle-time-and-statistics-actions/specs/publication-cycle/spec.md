## ADDED Requirements

### Requirement: Deux actions observées pour les rapports statistiques
CAB MUST tracer séparément le calcul et la validation des statistiques du change et des statistiques globales. Chaque action MUST porter ses propres horodatages et son résultat, dans la tentative qui l’a effectuée.

#### Scenario: Échec avant le calcul global
- **WHEN** le traitement du change échoue avant le lancement du global
- **THEN** seul le passage du traitement réalisé apparaît.

### Requirement: Ventilation des durées sans double comptage
L’Overview MUST distinguer le travail observé par CAB, le travail observé par les agents et l’attente observée pour chaque étape. Pour un cycle complètement mesuré, les trois colonnes MUST totaliser la durée écoulée affichée. CAB MUST recevoir les chevauchements. Une période sans preuve suffisante MUST être signalée comme non mesurée.

#### Scenario: Travail simultané
- **WHEN** CAB et un ou plusieurs agents travaillent au même instant
- **THEN** cet instant est attribué à CAB une seule fois.

#### Scenario: Arrondi des colonnes
- **WHEN** une ventilation complète est affichée au dixième de seconde
- **THEN** CAB, Agent(s) et Attente totalisent exactement la durée totale affichée.

### Requirement: Action conditionnelle du bilan de blocage
CAB MUST enregistrer une action pour l’écriture constatée de BLOCKERS.md ou la rédaction attestée par l’agent dans le passage courant. Il MAY accepter le nom historique BLOCKER.md. Le chemin et une empreinte MUST être contrôlés dans le change courant. En l’absence de bilan produit, aucune action correspondante MUST être affichée.

#### Scenario: CISM ou CISMP sans bilan de blocage
- **WHEN** le parcours ne produit aucun fichier de bilan
- **THEN** aucune action de bilan n’apparaît dans l’Overview.
