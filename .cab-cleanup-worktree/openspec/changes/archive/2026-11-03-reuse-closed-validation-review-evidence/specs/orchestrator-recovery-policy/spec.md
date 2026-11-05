## ADDED Requirements

### Requirement: Réutiliser uniquement les anciens appels déjà réconciliés par revue
Le système SHALL pouvoir qualifier un terminal de lecture dans un historique
contenant des refus antérieurs déjà couverts par un reçu DONE du même
propriétaire, RUN et contexte. Il SHALL vérifier l’opération close, son digest,
la demande native d’origine et chaque call ou wrapper réutilisé ; les parties
inconnues ou divergentes SHALL rester bloquantes. Le diagnostic complet et
l’issue historique indéterminée SHALL être conservés.

#### Scenario: Deux refus clos puis un terminal actuel
- **GIVEN** deux calls aborted déjà revus dans une validation CANCELLED et un unique terminal actuel exact
- **WHEN** le propriétaire demande reconcile-reviewed-terminal avec une nouvelle revue et des observations stables
- **THEN** les anciennes preuves sont référencées dans le reçu sans transformer leur issue et seule la coordination actuelle est clôturée

#### Scenario: Ancienne preuve divergente ou incomplète
- **GIVEN** un reçu non DONE, un autre contexte, un digest divergent, un call dupliqué ou modifié ou un effet non couvert
- **WHEN** le réemploi est envisagé
- **THEN** les protections sont conservées sans exécution native, permission ou résultat inventé

### Requirement: Retirer une coordination approuvée jamais émise
Le système SHALL permettre au propriétaire de retirer une validation PREPARED
approved non consommée, sans native, résultat ou accès, lorsque deux lectures
stables prouvent la session idle, zéro permission et aucun appel à effet
postérieur à la demande native exacte. L’action SHALL conserver approved
historique et qualifier seulement COORDINATION_WITHDRAWN_BEFORE_ISSUANCE,
sans preuve NO_EFFECT, nativeResult ou once fabriquée.

#### Scenario: Serveur préparé remplacé avant lancement
- **GIVEN** une policy withdraw-unissued-validation propriétaire et aucune émission native ou accès observés
- **WHEN** les identités, versions, frontières et lectures stables sont vérifiées
- **THEN** seule la coordination devient CANCELLED et l’ancienne réponse locale est retirée sans annulation native ou rejeu

#### Scenario: Effet ou permission déjà présent
- **GIVEN** un appel à effet, une permission, une once, un accès ou une frontière divergente
- **WHEN** le retrait est demandé
- **THEN** il est refusé et les protections sont conservées
