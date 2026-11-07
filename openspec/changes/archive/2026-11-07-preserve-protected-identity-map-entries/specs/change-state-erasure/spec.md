## ADDED Requirements

### Requirement: Conservation des entrées de dictionnaire du propriétaire protégé
Dans un lot, une clé secondaire cible SHALL NOT supprimer une entrée dont la valeur appartient à un RUN protégé cohérent. Projection, contrôle d’absence et fichiers nommés par identité SHALL conserver cette même frontière. Une réparation SHALL être additive, limitée aux entrées manquantes des RUN protégés et aux copies strictement identiques aux empreintes d’origine ; aucun accès actif, décision ou effet SHALL être créé ou rejoué.

#### Scenario: Clé d’opération historique partagée
- **WHEN** la clé apparaît dans la portée cible mais sa valeur appartient au RUN protégé
- **THEN** l’entrée complète est conservée et les références du RUN réellement retiré sont effacées

#### Scenario: Réparation vérifiée après contrôle différentiel
- **WHEN** des entrées manquantes correspondent exactement au relevé d’origine
- **THEN** seules ces entrées sont rétablies, sans écraser les progrès courants ni réactiver un accès clos

### Requirement: Retirer une demande technique résolue non acquise
Une demande DRAINING de GLOBAL_RECONCILIATION issue de technical-integrity-protection MAY être libérée sous mandat applicable après deux observations natives stables, zéro activité/permission, broker sain et frais et registre exact inchangé. La libération SHALL conserver toutes les protections locales et décisions. Une lease HELD, une cause métier, une preuve périmée ou une frontière divergente SHALL refuser cette voie. Aucun effet SHALL être rejoué.

#### Scenario: Réconciliation d’accès empêchée par la demande globale déjà résolue
- **WHEN** le broker et la frontière sont vérifiés sains après réparation, tandis que les accès locaux restent protégés
- **THEN** seule la demande technique non acquise est libérée et la réconciliation propriétaire ordinaire peut reprendre
