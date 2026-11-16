## ADDED Requirements

### Requirement: Références responsives propres aux pages
CAB MUST conserver en base des références de taille d’interface et de police propres à chaque page et chaque profil de résolution. Une référence non renseignée vaut 100 %. Le changement d’une référence depuis le bandeau MUST affecter uniquement la page visée et être synchronisé par Electric avec les autres fenêtres de cette page.

#### Scenario: Multiplicateur global
- **WHEN** les pourcentages globaux sont modifiés dans l’administration
- **THEN** chaque page applique le produit de ses propres références et des facteurs globaux, sans effacer ses références.

#### Scenario: Mode développeur
- **WHEN** un administrateur active le mode développeur depuis la page de mise à jour
- **THEN** les commandes du bandeau modifient les références de la page courante pour le profil de résolution le plus proche.
- **AND** le mode développeur est désactivé par défaut sur une installation neuve.
