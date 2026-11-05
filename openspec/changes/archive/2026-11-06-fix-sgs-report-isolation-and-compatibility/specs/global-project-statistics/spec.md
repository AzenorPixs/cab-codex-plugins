## MODIFIED Requirements

### Requirement: Rapports de change persistants
Le moteur MUST créer les rapports canoniques en six sections pour un change
archivé ou bloqué, depuis des preuves structurées. Un rapport existant MUST
garder structure, emplacement et historique, avec annexe si nécessaire. Les
sessions MUST être dédupliquées et leurs incréments/cumuls distingués. Un arrêt
MUST exiger BLOCKERS.md et MUST NOT valoir archivage. Le moteur MUST NOT modifier
les autres artefacts métier.

#### Scenario: Reprise d'un change bloqué
- **WHEN** une nouvelle session est ajoutée à un rapport existant puis le change archivé
- **THEN** le même rapport conserve les sessions antérieures, les nouveaux faits et son état final sans cumul double


### Requirement: Publication récupérable et validation indépendante
Pour le couple global, le moteur MUST utiliser `.STATISTICS.lock`, sérialiser lecture et publication,
préparer les deux candidats et un journal durable, vérifier les empreintes et
récupérer une interruption avant toute nouvelle mutation globale. Le contrôle indépendant MUST vérifier empreintes, NCA, agrégats, rendu et index.

#### Scenario: Sources de code
- **WHEN** le code actuel est compté
- **THEN** les chemins restent dans la racine sans liens ni secrets, l’analyse est lexicale et un langage non pris en charge est explicitement indisponible

#### Scenario: Publication interrompue
- **WHEN** le processus s'arrête entre les deux remplacements
- **THEN** le prochain lecteur récupère ou refuse l'état ambigu avant tout delta ou succès


## ADDED Requirements

### Requirement: Rapport individuel indépendant du global
CHANGE MUST produire le rapport sans lire ou récupérer la transaction globale.
Un delta demandé ensuite MUST utiliser sa propre protection et MUST retourner
son échec séparément sans retirer le succès du rapport individuel.

#### Scenario: Journal global irrécupérable
- **WHEN** une transaction globale ne peut pas être récupérée
- **THEN** CHANGE peut réussir et le delta échoue séparément en préservant le couple

### Requirement: Preuves sans fichier partagé
CHANGE MUST accepter les preuves JSON sur stdin avec --evidence - et MUST
sérialiser les éditions du même répertoire de rapport. Le candidat MUST être
le chemin du rapport suivi de .sgs-candidate et MUST être nettoyé après échec
propre. Deux changes MUST NOT partager leur fichier de preuves ou de candidat.

#### Scenario: Deux changes simultanés
- **WHEN** deux rapports sont générés avec leurs preuves sur stdin
- **THEN** leurs données et candidats restent distincts sans verrou global

### Requirement: Rapport historique explicitement identifié
--report MUST désigner un fichier existant dans le change ciblé. Sans option,
une variante connue MUST empêcher une création canonique ambiguë. Une structure
ancienne différente MUST être préservée avec une annexe sans nouveaux titres H2.

#### Scenario: Revalidation historique
- **WHEN** le rapport existant n’a pas six sections ou porte un autre nom
- **THEN** son contenu reste conservé dans le même fichier sans doublon canonique


### Requirement: Suivi initialisé avant les tâches
La session MUST vérifier VERSION et initialiser le suivi dès l’amorçage après
les sources requises, avant l’exploration métier. Elle MUST conserver session,
borne de début, deux rôles et sources disponibles, puis rattacher le change
autorisé avant sa première tâche. Un compteur non observé MUST rester inconnu.
Une reprise MUST préserver les identifiants et signaler les lacunes.

#### Scenario: Session directe ou pilotée
- **WHEN** la session démarre puis sélectionne son change
- **THEN** le contexte est initialisé à l’amorçage puis rattaché au change autorisé, sans sonde de pilotage implicite en mode direct


### Requirement: Nettoyage des statistiques après rapport durable
Après vérification du rapport individuel, la clôture MUST intégrer les données
statistiques rattachées au change dans l’effacement terminal des briques CAB,
après le nettoyage natif des sessions. Les branches TERMINÉ et BLOQUÉ pour
dépendance MUST être couvertes. Les pairs, rapports durables et états de reprise
prévus MUST être préservés. Un résultat non vérifié MUST rester un échec explicite.

#### Scenario: Rapport archivé ou blocage documenté
- **WHEN** le rapport est vérifié et les conditions de clôture sûre sont satisfaites
- **THEN** les statistiques du change sont effacées avec les états CAB puis leur absence est vérifiée sur disque et en mémoire

#### Scenario: Statistiques partagées
- **WHEN** une observation historique contient le change et un pair
- **THEN** seule la référence du change est retirée et les données du pair restent conservées
