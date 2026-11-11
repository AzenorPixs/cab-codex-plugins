## MODIFIED Requirements

### Requirement: Propriétaire unique et frontières communes
En direct, le codeur SHALL posséder sa coordination. Sous mandat autonome piloté,
le codeur SHALL déclarer, publier, recevoir, vérifier et acquitter sans validation
intermédiaire. Une adoption explicite SHALL transférer le rôle historique en
conservant SID/RUN, avis et provenance. L’ancien propriétaire SHALL NOT publier
concurremment. Sans adoption, les profils historiques SHALL rester compatibles.

#### Scenario: Résultat du codeur piloté
- **WHEN** le codeur autonome produit une preuve dans son mandat
- **THEN** il publie directement un avis sourcé sans décision intermédiaire du parent

#### Scenario: Client direct et client piloté
- **WHEN** une dépendance précise reçoit un avis entre ces deux modes
- **THEN** le codeur destinataire vérifie et acquitte sans lever une pause ni modifier une permission

## ADDED Requirements

### Requirement: Transport natif et identité du codeur
CAB MUST corréler projet/RUN/SID/génération et appel natif. La passerelle
inter-UID MUST vérifier le pair broker, sans partager le magasin privé.
Les notifications MUST viser le codeur concerné et MUST NOT réveiller un
orchestrateur pour un échange courant. Une réponse perdue MUST conserver
l’intention et interdire le rejeu avant réconciliation.

#### Scenario: Deux comptes système
- **WHEN** le broker et le contrôleur ont des UID différents
- **THEN** le codeur peut publier et recevoir sans accéder directement à SQLite

### Requirement: Stade et fraîcheur des avis
Chaque nouvel avis autonome MUST distinguer candidate, tested, accepted,
delivered et activated, avec preuve et empreinte. Une annonce candidate MUST NOT
valoir approbation finale. Un destinataire MUST revérifier la preuve ; une empreinte
périmée MUST rester non vérifiée. Les stades d’acceptation et livraison MUST être
adossés à leurs reçus d’autorité.

#### Scenario: Preuve modifiée
- **WHEN** le fichier référencé change après publication
- **THEN** le destinataire constate un avis périmé sans valider sa dépendance

### Requirement: Coordination ciblée et exceptions
Les avis MUST être limités aux dépendances déclarées, dédupliqués et persistants.
Un verrou temporaire ou une dépendance en cours MUST NOT solliciter systématiquement
l’orchestrateur. Les unités indépendantes MUST continuer. Un arbitrage d’interface,
de priorité ou de périmètre dépassant le cadrage MUST utiliser l’exception appropriée.
Les cycles MUST être exposés sans gel général ni décision inventée.

#### Scenario: Cycle entre deux missions
- **WHEN** deux dépendances forment un cycle
- **THEN** CAB expose le cycle et le codeur poursuit les unités indépendantes ou soumet un arbitrage hors cadrage
