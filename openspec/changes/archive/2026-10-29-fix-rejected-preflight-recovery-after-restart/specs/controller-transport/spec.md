## ADDED Requirements

### Requirement: Réconciliation humaine d'un prévol rejeté après perte de décision locale

CAB MUST offrir reconcile-rejected distinct de retry, avec autorisation humaine, identités conservées, prochain identifiant inédit et empreinte native complète. Il MUST vérifier le rejet corrélé sans effet, recontrôler puis sceller un reçu non exécutable. Il MUST NOT reconstruire approved ou émettre once. Le retry ordinaire MUST refuser une décision locale perdue.

#### Scenario: Rejet réconcilié après redémarrage

- **GIVEN** un recovery conservé avec erreur MCP -32602 puis soumission et rejet natif corrélés, sans effet et décision locale perdue
- **WHEN** le développeur autorise reconcile-rejected avec les identités et l'empreinte exactes
- **THEN** CAB scelle le reçu sans permission, conserve l'historique et réserve un nouveau prévol qui exige ses propres décision, once, exit 0 et READY
- **AND** seule une soumission enregistrée de /usr/bin/true exact est admise ; seules les erreurs MCP -32602 antérieures sont reconnues comme refus avant enregistrement

#### Scenario: Preuve insuffisante ou effet possible

- **GIVEN** une approbation, une commande, un autre outil, une activité, une permission, une demande restante, une identité différente ou une empreinte divergente
- **WHEN** reconcile-rejected est demandé
- **THEN** CAB refuse sans modifier le recovery ni transmettre de permission

### Requirement: Levée globale explicitement liée à un rejet réconcilié

Sous gel, reconcile-rejected MAY être examiné avec infrastructure saine et transaction exacte. Confirm et release MUST exiger autorité, reçu du même RUN/job/recovery et historique inchangé. CAB MUST vérifier la cohorte sans effet ni attente et refuser toute autre récupération non réconciliée. Cette exception MUST NOT autoriser de travail métier ni modifier les gardes des autres transactions.

#### Scenario: Transaction liée et cohorte quiescente

- **GIVEN** un reçu de rejet sans effet lié à la transaction globale courante et une cohorte vérifiée quiescente
- **WHEN** l'orchestrateur confirme puis libère explicitement cette transaction avec l'autorité et la référence exactes
- **THEN** CAB conserve le recovery et ses preuves et permet seulement la poursuite normale du nouveau prévol

#### Scenario: Transaction ou cohorte divergente

- **GIVEN** une transaction différente, un reçu altéré, un effet inconnu ou une autre récupération non réconciliée
- **WHEN** une confirmation ou libération est demandée
- **THEN** CAB refuse et conserve le gel
