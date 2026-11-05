## MODIFIED Requirements

### Requirement: Retirer une coordination approuvée jamais émise
Le système SHALL permettre au propriétaire de retirer une validation PREPARED
approved non consommée, sans native, résultat ou accès exécutable, lorsque deux
lectures stables prouvent la session idle, zéro permission et aucun appel à
effet postérieur à la demande exacte. L’action SHALL conserver approved et
qualifier seulement COORDINATION_WITHDRAWN_BEFORE_ISSUANCE, sans NO_EFFECT,
nativeResult ou once fabriquée. Les exceptions typées restent distinctes.

#### Scenario: Serveur préparé remplacé avant lancement
- **GIVEN** une policy withdraw-unissued-validation propriétaire et aucune émission native ou accès observés
- **WHEN** les identités, versions, frontières et lectures stables sont vérifiées
- **THEN** seule la coordination devient CANCELLED et l’ancienne réponse locale est retirée sans annulation native ou rejeu

#### Scenario: Parent seulement référencé libéré après rattachement refusé
- **GIVEN** une décision approved, aucun native/nativeResult/once, un parent unique RELEASED de même RUN/contexte/version et aucune appartenance de l’enfant à ses membres
- **WHEN** le reçu de libération, les membres terminaux et deux frontières natives sans effet ni permission sont vérifiés
- **THEN** le propriétaire retire uniquement l’enfant sans modifier la décision, le parent ni les baux
- **AND** les ressources excédentaires du manifeste ne deviennent pas exécutables et une unité corrigée utilise de nouvelles identités

#### Scenario: Effet ou permission déjà présent
- **GIVEN** un appel à effet, une permission, une once, un accès actif non qualifié ou une frontière divergente
- **WHEN** le retrait est demandé
- **THEN** il est refusé et les protections sont conservées

## ADDED Requirements

### Requirement: Retirer une décision rejetée jamais émise
Le propriétaire SHALL pouvoir retirer une opération PREPARED dont la décision
est rejected, sans native, nativeResult, once ou accès lié, par la récupération
qualifiée withdraw-unissued-validation. Le contrôleur SHALL conserver les
guardes de propriétaire/policy, identité et deux lectures natives stables.
Seule la coordination SHALL devenir CANCELLED ; rejected SHALL rester historique.

#### Scenario: Rejet terminal sans émission empêchant la clôture
- **WHEN** la décision rejetée exacte est terminale, le SID courant idle, sans permission ni effet, et la frontière reste stable
- **THEN** le retrait retire la réponse locale inexécutable et conserve la décision rejected dans le registre et le reçu après redémarrage

### Requirement: Retrait sur référence d’accès déjà libéré
Un parent seulement référencé puis RELEASED SHALL être admissible au retrait
sans émission avec reçu de libération valide, membres terminaux et absence de
membership de l’enfant. Le contrôleur SHALL vérifier les identités, deux
frontières natives sans effet ni permission et l’empreinte stable du parent.
La décision, le parent et les baux SHALL rester inchangés.

#### Scenario: Manifeste enfant excédant l’ancien parent
- **WHEN** le rattachement a été refusé avant once et les préconditions du retrait sont prouvées
- **THEN** seule la coordination enfant devient CANCELLED sans rendre ses ressources exécutables
