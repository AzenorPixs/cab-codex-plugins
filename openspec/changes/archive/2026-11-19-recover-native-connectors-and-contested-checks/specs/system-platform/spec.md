## ADDED Requirements

### Requirement: Liaison native et connecteur distingués
CAB MUST retourner séparément la liaison du journal natif et celle du connecteur authentifié. Il MUST NOT présenter une liaison de journal seule comme une autorisation Git. Une réparation MUST préserver les identités et les effets indécis, sans rejouer de requête métier.

#### Scenario: Journal lié sans worker reconnu
- **WHEN** le journal est vérifié mais le worker appelant ne correspond à aucun connecteur vivant authentifié
- **THEN** `native.bind` indique `connector_bound=false` et les opérations Git restent refusées.

#### Scenario: Worker réel reconnu
- **WHEN** le worker appelant appartient au relais authentifié enregistré et la liaison de RUN est admissible
- **THEN** `native.bind` indique `connector_bound=true` et le contexte Git identifie ce seul RUN.

#### Scenario: Récupération du couple réel sans heartbeat observé
- **WHEN** le worker authentifié et son parent CAB sont vérifiés par UID, agent, PPID, PID/start/boot, sans registre concurrent ni liaison de RUN incompatible
- **THEN** CAB peut créer une observation conservatrice `OBSERVED` permettant le rattachement du RUN vérifié ; versions et catalogue restent inconnus, incertitude vraie, sans prétendre à un heartbeat ou une disponibilité CABU.

#### Scenario: Heartbeat réel après récupération
- **WHEN** le parent authentifié fournit ensuite son vrai heartbeat pour le même couple kernel
- **THEN** CAB adopte atomiquement la liaison dans le registre du heartbeat, conserve l'ancienne observation `SUPERSEDED` et garantit un seul connecteur sélectionnable.

### Requirement: Contestation administrative d'un contrôle non probant
CAB MUST permettre à un administrateur authentifié de contester une preuve CAB de contrôle courant en désignant RUN, check, opération, preuve et leurs empreintes exactes. Il MUST conserver les originaux, l'autorité, la raison et l'autorisation dans un événement durable, exclure cette preuve et incrémenter la révision du seul contrôle après correction de son argv. Critères, producteurs et revue MUST rester inchangés. La contestation MUST NOT exécuter de commande ni lever une protection.

#### Scenario: Contrôle réussi sans test découvert
- **WHEN** l'administrateur démontre que la réussite courante ne mesure pas le critère et transmet un argv corrigé
- **THEN** CAB conserve le reçu initial intact, exclut la preuve contestée et exige une nouvelle exécution à la nouvelle révision ; la seule preuve contestée ne permet aucune clôture.

#### Scenario: Répétition et concurrence
- **WHEN** une demande identique est répétée ou une demande concurrente porte une empreinte périmée
- **THEN** CAB retourne le même reçu dans le premier cas et refuse le second ; aucun autre contrôle n'est modifié.

#### Scenario: Frontière protégée
- **WHEN** un effet est indécis, un bail détenu, le RUN gelé, importé, revu ou clôturé
- **THEN** CAB refuse la contestation et conserve toutes les protections et preuves.

### Requirement: Récupération autonome bornée du parcours de livraison
CAB MUST permettre une correction administrative de préqualification `development` vers `delivery` uniquement avant toute opération ou preuve et si une publication est déjà cadrée. Les critères, checks, producteurs et revue MUST rester inchangés ; empreintes, historique et protections MUST être conservés. CAB MUST inclure les rapports CAB vérifiés des archives validées appartenant explicitement au lot de la même session, sans réservation ou édition des statistiques par le LLM.

#### Scenario: Admission de livraison corrigée avant qualification
- **WHEN** l'administrateur transmet les empreintes exactes, l'autorisation et `nature=delivery` avant opération, preuve, effet, bail, revue, gel ou import, avec publication déjà cadrée
- **THEN** CAB conserve le contrat initial, corrige seulement la nature, exige les nouvelles preuves et refuse toute autre transition.

#### Scenario: Rapports générés des archives du lot
- **WHEN** des archives de RUN CLOSED prouvés du même projet, acteur et SID ont proposal.md et tasks.md réservés dans l'index courant
- **THEN** CAB inclut leurs rapports générés prêts, sans override, dont le SHA entier correspond au fichier vérifié ; une réservation contradictoire ou un contenu modifié empêche son adoption et aucun rapport étranger n'est absorbé.

#### Scenario: Réservation après archivage vérifié
- **WHEN** la réconciliation officielle du même RUN constate une archive unique réelle et l'absence de la source, avec les anciens chemins réservés dans le même index, acteur et session
- **THEN** CAB reconnaît automatiquement les mêmes fichiers relatifs sous leur chemin d'archive, conserve la provenance dans le reçu de réservation et refuse toute cible non régulière, étrangère ou concurrente ; les captures initiales restent intactes.
