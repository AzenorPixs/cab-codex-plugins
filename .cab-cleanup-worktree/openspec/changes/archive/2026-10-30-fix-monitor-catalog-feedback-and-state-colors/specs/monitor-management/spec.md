## ADDED Requirements

### Requirement: Retour immédiat du rangement confirmé
Après archive/delete/restore réussi, le serveur MUST retourner la vue projetée confirmée et le navigateur MUST l’appliquer immédiatement, y compris en mode Manuel. Il MUST invalider les lectures antérieures pour empêcher leur réponse ou erreur tardive de restaurer l’ancienne vue. La cadence et les gardes d’éligibilité MUST rester inchangées ; aucun POST MUST être rejoué automatiquement.

#### Scenario: Archivage en mode Manuel
- **WHEN** le serveur confirme le rangement d’une ligne admissible
- **THEN** la ligne disparaît du tableau et apparaît dans ARCHIVES sans reload ni clic Actualiser

#### Scenario: Lecture antérieure retardée
- **WHEN** une lecture commencée avant le rangement finit après sa confirmation
- **THEN** son ancienne vue ou son erreur ne réintroduit pas la ligne et ne remplace pas la vue confirmée

#### Scenario: Refus ou affichage non confirmé
- **WHEN** le rangement est refusé ou son reçu ne contient pas de vue valide
- **THEN** aucun masquage optimiste n’a lieu et le message distingue refus et rangement enregistré dont la vue reste à actualiser
