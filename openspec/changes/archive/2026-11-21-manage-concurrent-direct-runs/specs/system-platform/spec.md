## ADDED Requirements

### Requirement: Annulation vérifiée d’un RUN direct remplacé

CAB MUST refuser un deuxième RUN direct actif pour le même acteur, SID,
projet et change. Une admission de remplacement MUST annuler le premier
dans la même transaction si son absence d’exécution est prouvée. CAB MUST
conserver un reçu lié au successeur et archiver le cadrage annulé.

#### Scenario: Remplacement d’un cadrage sans exécution
- **WHEN** un nouveau cadrage autorisé désigne son prédécesseur sans activité
- **THEN** CAB archive son annulation et admet le successeur en une transaction.

#### Scenario: Historique du successeur livré
- **WHEN** une régularisation autorisée désigne le successeur clôturé et livré
- **THEN** CAB vérifie son archive et relie l’annulation du premier cadrage au successeur.

### Requirement: Routage des RUN directs concurrents du même SID

Un connecteur Codex MUST accueillir plusieurs RUN directs identifiés par
le même journal natif vérifié. Le routage Git et livraison MUST valider le
couple projet/RUN à l’admission et refuser une cible implicite ambiguë.

#### Scenario: Travaux concurrents
- **WHEN** deux RUN directs distincts sont rattachés au même journal
- **THEN** leurs opérations et reçus restent corrélés à la cible vérifiée
- **AND** la liaison du premier reste utilisable pendant le travail du second.

### Requirement: États de session anglais et concis

Les états et protections visibles dans Sessions, Archives et le détail RUN
MUST employer des libellés anglais courts. L’annulation avant exécution MUST
afficher le lien vers le RUN de remplacement.

#### Scenario: Cadrage annulé
- **WHEN** l’utilisateur consulte un cadrage annulé dans les archives
- **THEN** CAB présente Cancelled before start et le lien du successeur.
