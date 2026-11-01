## MODIFIED Requirements

### Requirement: Restitution sans effet d'un bail restauré lorsque le jeton est perdu
CAB MAY restituer un bail HELD restauré sans jeton par preview/POST sur le même
RUN et change armé. L’absence d’effet MUST être prouvée par transcript natif
complet ou, après compaction, par registre durable complet attestant que chaque
opération postérieure est rejetée/annulée sans démarrage natif et qu’aucun
accès/permission n’est actif. Toute opération inconnue ou démarrée conserve
HELD ; aucun jeton n’est révélé.

#### Scenario: Bail restauré inutilisé dans un change déjà armé
- **WHEN** le bail est HELD/restauré, le RUN et son job armé portent le même
  change, le transcript complet prouve zéro mutation et aucune opération active
- **THEN** le propriétaire peut restituer le bail sans ancien token ni nouvelle
  permission ; CAB marque uniquement ce bail RELEASED avec un reçu sans token

#### Scenario: Bail restauré avec activité ou preuve incertaine
- **WHEN** une permission, un mandat, un effet, une opération en cours/inconnue,
  une mutation ou une divergence d’historique est observée
- **THEN** preview ou POST refuse et le bail reste HELD sans suppression de token

#### Scenario: Compaction avec registre complet sans démarrage natif
- **WHEN** une compaction survient après l’acquisition, chaque opération
  postérieure est durablement rejetée/annulée sans `nativeStart`, la session est
  idle, aucune permission ou accès n’est actif et la frontière ne change pas
- **THEN** CAB enregistre une preuve `operation-ledger-after-compaction` et peut
  restituer uniquement le bail inutilisé

#### Scenario: Compaction avec opération native inconnue ou démarrée
- **WHEN** après compaction une opération est absente du registre, non terminale,
  munie d’un `nativeStart`, ou une permission/accès reste actif
- **THEN** preview ou POST refuse et le bail reste HELD

#### Scenario: Scope ou frontière divergente
- **WHEN** le `changeId`, propriétaire, session, contexte, répertoire, version,
  fencing ou digest de preview diverge du RUN courant
- **THEN** le POST est refusé sans mutation ni restitution
