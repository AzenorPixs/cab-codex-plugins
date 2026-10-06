## ADDED Requirements

### Requirement: Recherches indexées pendant la liste des approbations
CAB SHALL construire un index temporaire des couples `(approval_id, event_type)`
depuis une seule lecture initiale du journal avant la boucle de réparation de
chaque appel de liste portant sur un magasin non vide. CAB SHALL utiliser cet
index pour les recherches de présence de cette boucle, y compris les éléments
exclus du résultat par le filtre ou la limite. CAB SHALL préserver les verrous,
les validations d'arguments et d'identifiants, les expirations sauvegardées avant
journalisation, les append durables et leurs contrôles existants, la propagation
des erreurs, le tri, le compte total, le filtre et la limite. CAB SHALL NOT
conserver l'index après l'appel ou le réutiliser dans un autre appel. Les
recherches sans index SHALL conserver leur comportement existant.

#### Scenario: Journal cohérent et résultat filtré
- **WHEN** un appel de liste rencontre un magasin non vide et un journal cohérent
- **THEN** ses recherches de présence utilisent une seule lecture initiale sans relire le journal pour chaque approbation
- **AND** les résultats filtrés, le compte total, le tri et la limite restent inchangés
- **AND** aucun événement fondamental supplémentaire n'est ajouté

#### Scenario: Événement manquant et répétition de la liste
- **WHEN** un appel de liste rencontre un événement de création ou terminal manquant
- **THEN** CAB le répare selon les règles existantes et actualise l'index seulement après une écriture durable réussie
- **AND** une répétition de la réparation ou de l'appel ne crée aucun doublon

#### Scenario: Expiration pendant la liste
- **WHEN** un appel de liste rencontre une approbation PENDING expirée
- **THEN** CAB sauvegarde EXPIRED avant la journalisation et ajoute l'événement terminal selon les règles existantes
- **AND** les résultats et le compte tiennent compte du nouvel état

#### Scenario: Échec de lecture ou d'écriture
- **WHEN** la lecture initiale ou l'écriture d'un événement échoue
- **THEN** CAB propage l'erreur selon le contrat existant sans considérer une écriture échouée comme présente dans l'index

#### Scenario: Magasin vide
- **WHEN** un appel de liste rencontre un magasin vide
- **THEN** CAB retourne une liste vide et un compte nul sans lire ni réparer le journal

#### Scenario: Intégrité invalide lors d'une réparation
- **WHEN** un appel de liste tente une réparation sur un journal dont la chaîne est invalide
- **THEN** CAB conserve les contrôles de l'append et propage l'erreur sans ajouter l'événement à l'index
