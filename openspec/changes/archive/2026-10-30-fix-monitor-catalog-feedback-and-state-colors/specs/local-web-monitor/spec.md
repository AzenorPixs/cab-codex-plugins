## MODIFIED Requirements

### Requirement: Surbrillance du job selon son état
La ligne du job dans Espace de travail MUST présenter un fond jaune pour WAITING, bleu pour BLOCKED, vert pour DONE et orange pour STOPPED. Le texte ETAT MUST rester lisible et la sélection distincte. La couleur MUST NOT modifier l'étape ou remplacer le code d'état. Une source périmée donnant UNKNOWN MUST retirer cette surbrillance courante.

#### Scenario: Attente devenue blocage
- **WHEN** l'état actuel d'un job passe de WAITING à BLOCKED
- **THEN** sa ligne passe du jaune au bleu par mise à jour SSE, sans modifier son étape

#### Scenario: Blocage prioritaire sur une attente
- **WHEN** un job possède une demande en attente et une cause actuelle d'effets inconnus ou HUMAN_REQUIRED
- **THEN** ETAT est BLOCKED et sa ligne bleue, sans masquer le blocage sous WAITING


#### Scenario: Terminaison et arrêt
- **WHEN** l’état observé devient DONE ou STOPPED
- **THEN** la ligne devient respectivement verte ou orange et sa sélection reste distincte
