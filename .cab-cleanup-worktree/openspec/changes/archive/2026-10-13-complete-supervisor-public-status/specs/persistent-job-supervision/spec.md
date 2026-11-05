## MODIFIED Requirements

### Requirement: Observabilité sans secret

Le superviseur SHALL publier localement, sans secret, l'identité du job,
l'état de supervision, le dernier jalon prouvé, l'âge de la dernière activité,
le nombre et le résultat des tentatives de reprise, le gate terminal et la
cause courante. Jalons et gate SHALL provenir du contrat observé du contrôleur.
Les transitions SHALL être journalisées dans le magasin local du superviseur.

#### Scenario: Consultation d'un job non terminal
- **WHEN** un client local consulte l'état d'un job dont le gate est ouvert
- **THEN** il reçoit l'état de supervision et la raison de non-terminalité sans contenu de projet, secret ni décision détaillée

#### Scenario: Jalon et gate observés
- **WHEN** le superviseur réconcilie un job portant un jalon prouvé et un gate OPEN
- **THEN** son statut publie ce jalon et ce gate pour l'identité du job observé

#### Scenario: Réconciliation indisponible
- **WHEN** le contrat courant ne peut plus être relu
- **THEN** le statut rend l'échec et la dernière réconciliation observables sans présenter une nouvelle preuve de jalon ou de gate

### Requirement: Compteur persistant des tentatives de reprise

Le superviseur MUST exposer `resumeAttemptCount` par job. Un job neuf MUST
commencer à zéro. Avant chaque émission de reprise, le compteur connu MUST
être incrémenté et persisté avec la tentative ; un échec de persistance MUST
interdire l'émission. Le compteur MUST distinguer tentative et succès et
survivre au redémarrage et au transfert de session du même job.

#### Scenario: Émission réussie ou échouée
- **WHEN** une requête de reprise est émise puis réussit ou échoue
- **THEN** elle compte une tentative et son résultat reste publié séparément

#### Scenario: Préparation sans émission
- **WHEN** une relance est refusée, gelée ou abandonnée avant son émission
- **THEN** le compteur ne change pas

#### Scenario: Persistance impossible
- **WHEN** l'enregistrement du compteur et de la tentative échoue
- **THEN** aucune requête de reprise n'est émise

#### Scenario: Même job après interruption ou transfert
- **WHEN** le superviseur redémarre ou suit une nouvelle session du même job
- **THEN** il conserve le compteur connu de ce job

### Requirement: Compatibilité du statut de supervision historique

Un état ancien dépourvu de compteur MUST rester lisible et publier
`resumeAttemptCount: null` pour ce job. Le superviseur MUST NOT reconstruire
le nombre de tentatives depuis la dernière tentative. Un nouveau job MUST
réinitialiser son compteur à zéro et MUST NOT hériter du jalon ou du gate
du job précédent.

#### Scenario: Ancien état sans compteur
- **WHEN** le superviseur restaure un état historique sans compteur pour le même job
- **THEN** le compteur reste inconnu, y compris après de nouvelles tentatives de ce job

#### Scenario: Nouveau job
- **WHEN** le contrat observé désigne un autre job
- **THEN** son compteur commence à zéro et son jalon et son gate proviennent de son propre contrat
