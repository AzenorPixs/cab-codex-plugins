## ADDED Requirements

### Requirement: Intégrité des reçus de permission projetés
Lors de l'effacement terminal, CAB SHALL retirer entièrement un reçu de permission natif uniquement si son enveloppe est valide, son empreinte correspond à sa valeur et son identité appartient à la portée cible dans le workspace concerné. CAB SHALL conserver les reçus étrangers et les enveloppes incomplètes de propriété inconnue. Une référence cible dans une enveloppe invalide SHALL bloquer la projection. CAB SHALL NOT reconstruire une décision ni rejouer une permission.

#### Scenario: Reçu valide de la cible
- **WHEN** un reçu valide appartient à une session du change terminal dans le workspace ciblé
- **THEN** le fichier entier est retiré dans le plan d'effacement et aucune enveloppe incomplète n'est produite

#### Scenario: Reçu étranger ou enveloppe sans identité
- **WHEN** un reçu valide appartient à une autre session ou une enveloppe incomplète ne fournit aucune identité cible
- **THEN** le fichier est conservé sans modification

#### Scenario: Référence cible dans un reçu invalide
- **WHEN** une enveloppe invalide contient une identité de la cible
- **THEN** la projection est refusée sans altérer les fichiers
