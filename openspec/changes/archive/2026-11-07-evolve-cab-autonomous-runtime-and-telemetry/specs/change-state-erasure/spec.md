## MODIFIED Requirements

### Requirement: Éligibilité terminale qualifiée
CAB SHALL refuser le nettoyage d’un RUN en cours et permettre celui d’un RUN clos sous le mandat applicable. Un arrêt explicite pour dépendance insatisfaite MAY clore le RUN tout en conservant le change ouvert et sa session métier de reprise. Les rapports/statistiques requis SHALL être durablement enregistrés avant purge des buffers. Les seuls anciens formats SHALL NOT bloquer le nettoyage.

#### Scenario: Change finalisé
- **WHEN** le propriétaire a clos le RUN et vérifié les rapports du change finalisé
- **THEN** le nettoyage ciblé est permis dans le mandat sans nouveau consentement

#### Scenario: Arrêt pour dépendance non satisfaite
- **WHEN** le RUN est arrêté pour dépendance avec rapports et statistiques conservés
- **THEN** le change reste ouvert et la seule session métier de reprise prévue est conservée hors état opérationnel CAB

#### Scenario: Clôture autoritaire
- **WHEN** le RUN est clos dans le registre applicable et les rapports sont conservés
- **THEN** CAB permet l’inventaire et le nettoyage ciblés sans nouvelle autorisation dans le mandat

### Requirement: Protection des effets non réconciliés
CAB SHALL préserver tout RUN réellement en cours et les données des pairs. Une ancienne trace d’opération d’un RUN clos SHALL être interprétée selon son format et sa clôture autoritaire sans fabriquer de résultat natif. Une pause ou activité native encore en cours SHALL ne pas être présentée comme une clôture.

#### Scenario: Port protégé sans résultat natif
- **WHEN** un RUN encore en cours conserve un port protégé sans preuve de terminaison
- **THEN** CAB refuse sa purge et conserve les protections

#### Scenario: RUN en cours
- **WHEN** le RUN cible reste en cours
- **THEN** le nettoyage est refusé et ses données restent intactes

## ADDED Requirements

### Requirement: Effacement exécuté sous chaque compte système
Chaque brique SHALL vérifier une intention locale authentifiée et exécuter l’effacement de ses fichiers sous son propre UID. Les clés privées SHALL rester chez leur propriétaire. Le coordinateur SHALL conserver intentions/reçus et reprendre une transaction SEALED existante sans changer son identité ou rejouer un effet métier. Après certificat externe vérifié, les reçus temporaires SHALL être supprimés et l’absence confirmée.

#### Scenario: Contrôleur et broker sous deux UID
- **WHEN** le broker ne peut pas lire les fichiers privés du contrôleur
- **THEN** il vérifie l’intention via le canal qualifié, applique sa partie sous son UID et fournit un reçu sans élargissement de permissions
