## ADDED Requirements

### Requirement: Distribution du contrat modèle explicite2.1.18
La distribution MUST aligner composants et commandes sur2.1.18 et documenter reasoning en entrée et variant dans les lectures natives. Skill et commande MUST présenter le refus du champ variant et la conversion explicite, sans alias ni repli silencieux. La qualification source MUST préserver les RUN et processus ; une publication MUST NOT être annoncée comme activation.

#### Scenario: Appel corrigé sans modification du codeur
- **WHEN** un pilote rencontre opencode-model-variant-unsupported
- **THEN** il prépare un nouvel appel conforme après vérification de l’absence d’effet, sans modifier implicitement son modèle actif ni rejouer de permission
