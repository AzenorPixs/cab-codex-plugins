## MODIFIED Requirements

### Requirement: Contrat initial de finalisation autonome
CAB MUST conserver le cadrage métier immutable par RUN : nature, critères,
preuves attendues et décisions réservées. Les clients MUST pouvoir le déclarer
au cadrage. Une adoption explicite unique MAY être admise avant effet/revue/gel ;
les RUN anciens ou importés MUST NOT être migrés implicitement. Le seul argv
d'un contrôle récupérable MAY être révisé par son codeur propriétaire, directement
ou en piloté, sans validation intermédiaire, avec justification et empreinte attendue.

#### Scenario: Cadrage direct ou piloté
- **WHEN** un contrat couvre les critères avec checks ou preuves attendues
- **THEN** CAB le conserve et pilote sa finalisation sans soumission finale du codeur

#### Scenario: Correction autonome d'un contrôle
- **WHEN** le propriétaire corrige un contrôle non exécuté, échoué ou périmé sans effet indécis, bail, gel, import, revue ou clôture
- **THEN** CAB conserve ancien contrat et reçus, incrémente la révision du contrôle et exige une preuve nouvelle sans modifier les exigences métier

#### Scenario: Requête concurrente ou retour à un ancien contrôle
- **WHEN** une révision vise une empreinte périmée ou réutilise un ancien argv
- **THEN** CAB refuse la concurrence périmée et ne réactive jamais un succès d'une révision antérieure ; un doublon identique conserve son reçu

### Requirement: Finalisation mécanique et attentes explicites
CAB MUST assembler et vérifier les preuves au fil des événements et au redémarrage.
Le contrat satisfait MUST conduire à CLOSED11/11, périodes et statistiques finalisées,
sans commande finale du LLM. Les validations réservées MUST rester exigées.
Les preuves manquantes, échouées ou périmées MUST apparaître avec actions précises
et identités des contrôles ou requêtes concernés. CAB MUST NOT déduire un succès,
réexécuter un travail ni transformer un ancien journal en reçu d'exécution.

#### Scenario: Contrat satisfait sans soumission du LLM
- **WHEN** les checks cadrés sont réussis, les preuves attendues reçues et le change archivé
- **THEN** CAB ferme la période du seul RUN sur snapshot réel et émet un reçu unique de clôture

#### Scenario: Reprise ou protection
- **WHEN** le service redémarre, un effet est UNKNOWN ou une source a changé
- **THEN** CAB expose les actions nécessaires et reprend ses contrôles sans rejouer de travail ni lever de protection

#### Scenario: Contrat ou preuve manquante
- **WHEN** un RUN attend un contrat, une exécution, un producteur, une archive ou une revue
- **THEN** le statut indique la commande ou l'autorité requise et ses faits manquants, sans action implicite ni fermeture inventée

### Requirement: Réconciliation propriétaire après archivage
Le propriétaire d’un RUN direct WORKING ou FINALIZATION_PENDING MUST pouvoir appeler run.reconcile_archive
avec project_id, run_id, archive_path et expected_framing_digest. Seuls les chemins
du change disparu MUST être remplacés par son archive datée canonique. La commande
MUST refuser un cadrage périmé, un autre change, une source encore présente, une
opération non terminale ou un bail détenu. Aucun autre champ métier n’est amendable.

#### Scenario: Archivage suivi d’un nouveau test
- **WHEN** le propriétaire soumet l’archive exacte d’un change déplacé et le digest courant
- **THEN** les chemins et la révision sont actualisés avec un événement d’audit, et une nouvelle requête distincte peut être admise

#### Scenario: Réconciliation répétée
- **WHEN** le même appel est répété après une réponse perdue
- **THEN** le résultat précédent est reconnu sans second amendement ou événement

#### Scenario: Protection des effets et identités
- **WHEN** une réconciliation est demandée alors qu’un effet est en cours ou inconnu
- **THEN** CAB refuse et conserve les protections ; les SID, RUN, génération, gel natif, métriques et reçus restent inchangés

