## ADDED Requirements

### Requirement: Rapport réel d’une session canonique
Un RUN de livraison sans dossier de change MUST produire son rapport sous statistics/runs/<identité>/STATISTICS.md s’il cadre une spécification canonique réelle. Le chemin MUST dériver du projet, RUN, SID et génération. CAB MUST projeter le maître local en PG, borner ses mesures au RUN et conserver N/A. Un ChangeSource disparu MUST NOT devenir un repli canonique.

#### Scenario: Livraison canonique prouvée
- **WHEN** les preuves courantes sont acquises sans dossier de change et la spécification canonique cadrée existe
- **THEN** CAB produit un rapport réel sans créer ChangeSource, tâches ou archive artificiels

#### Scenario: Rapport de session et global
- **WHEN** CAB publie le rapport canonique puis le global
- **THEN** il indexe les seuls documents concernés, conserve leurs empreintes et inclut le maître une seule fois sans compter les autres RUN

#### Scenario: Source disparue ou document étranger
- **WHEN** un ancien ChangeSource a disparu ou la cible appartient à un autre RUN ou à une réservation étrangère
- **THEN** CAB conserve le blocage et ne remplace aucun document ou contexte

### Requirement: Clôture canonique confirmée par le moteur
CAB MUST utiliser son moteur de commit terminal pour publier le rapport canonique et le global avant CLOSED. Il MUST vérifier le namespace exact du RUN et conserver les protections des états inconnus. La reprise MUST NOT réexécuter la livraison ni retirer l’exigence de publication terminale.

#### Scenario: Rapport prêt après livraison
- **WHEN** le rapport canonique réel est publié et indexé après une livraison confirmée
- **THEN** CAB effectue le seul commit terminal et vérifie ses destinations avant clôture

#### Scenario: Commit terminal indécis
- **WHEN** le commit terminal ou son envoi est UNKNOWN
- **THEN** CAB conserve le reçu et expose le blocage sans créer une nouvelle livraison ou un autre commit

### Requirement: Visibilité des blocages postérieurs au dossier
La consultation de finalisation MUST exposer les manques persistés après le dossier de preuves, avec la phase réelle et les actions correspondantes. Elle MUST NOT annoncer READY tant qu’un rapport ou commit terminal requis reste bloqué. Seule une progression réelle MAY retirer cette attente.

#### Scenario: Rapport manquant malgré preuves valides
- **WHEN** le dossier est valide et la phase FINALIZING attend un rapport ou un commit
- **THEN** le statut et la réévaluation affichent cette attente au lieu d’un faux READY
