# global-project-statistics Specification

## Purpose
Produire, maintenir et interroger les statistiques de projet et de change avec
un moteur Python indépendant des agents, des orchestrateurs et du pilotage,
en conservant les preuves, les historiques et la cohérence du couple global.

## Requirements

### Requirement: Brique Statistiques du Web Monitor
Le Web Monitor MUST afficher la version et l’état du service SGS réellement chargé, par une requête IPC bornée sans génération de rapport. Une source indisponible ou divergente MUST être distincte de READY. La CLI de rapports MUST rester utilisable sans service permanent. La carte MUST NOT lancer une reconstruction statistique ni exposer chemins privés, secrets ou sorties brutes.

#### Scenario: Service SGS disponible
- **WHEN** SGS répond READY avec sa version chargée
- **THEN** la carte affiche cette version sans lancer de rapport ou de reconstruction

#### Scenario: Moteur cohérent disponible
- **WHEN** le service SGS et le moniteur ont une version cohérente et le service est READY
- **THEN** la carte présente Disponible et sa version chargée sans génération de rapport

#### Scenario: Paquet incomplet ou version différente
- **WHEN** le service ne répond pas ou sa version diffère de celle attendue
- **THEN** la carte indique Indisponible ou Version divergente sans bloquer les autres vues

### Requirement: Équivalence des rapports existants
Les rapports produits MUST conserver au minimum la richesse des rapports de
change et du global Pixs examinés comme références. Le global MUST couvrir
tous les indicateurs SGS et leurs ventilations disponibles. Un rapport de
change MUST conserver agents, preuves, tableaux détaillés, historique et
inconnues ; le générateur MUST NOT remplacer une mesure disponible par N/A
au seul motif que son format narratif diffère.

#### Scenario: Références riches Pixs
- **WHEN** les rapports contiennent modèles, tokens, cache, sondes, rôles, outils et résultats détaillés
- **THEN** des fixtures représentatives vérifient extraction et rendu de ces champs sans modifier Pixs ni copier ses chiffres dans CAB

### Requirement: Moteur distribué indépendant du pilotage
Le plugin CAB MUST fournir un moteur Python en bibliothèque standard, le skill
`sgs` et la commande `/SGS` en majuscules. Le moteur MUST exiger une racine de
projet et un contrat SGS explicites. Il MUST NOT démarrer CAB, OpenCode, un
service, une collecte de quota ou une installation de dépendance.

#### Scenario: Invocation manuelle
- **WHEN** SGS est demandé manuellement pour un projet
- **THEN** le moteur reconstruit le global depuis toutes les archives admissibles et le code actuel, sans réutiliser les anciens agrégats

### Requirement: Extraction traçable et examen des ambiguïtés
Chaque mesure MUST conserver son état connu, absent ou contradictoire, son unité
et sa preuve. Une correction d'extraction MUST être liée à l'empreinte du rapport
et aux lignes de preuve. Un rapport non analysé MUST NOT devenir entièrement
indisponible pour contourner son examen. Les nombres MUST rester exacts jusqu’à l’affichage ; les quotas MUST NOT figurer
dans le global.

#### Scenario: Agrégation
- **WHEN** les mesures sont agrégées
- **THEN** les tests finaux restent distincts des essais et sous-ensembles, et les moyennes et ratios utilisent leurs populations valides respectives

#### Scenario: Valeurs contradictoires
- **WHEN** deux valeurs incompatibles restent sans résolution documentée
- **THEN** la seule mesure concernée devient indisponible avec motif et les autres mesures sont traitées

### Requirement: Séparation stricte entre reconstruction et delta
En reconstruction explicite, le moteur MUST supprimer le seul rapport global
avant recalcul et MUST laisser ce rapport absent si le recalcul échoue. En
maintenance de codage, le moteur MUST ne rien créer si le global est absent.
Une incompatibilité MUST NOT déclencher une reconstruction automatique.

#### Scenario: Delta compatible
- **WHEN** le couple est compatible
- **THEN** seule la contribution ciblée et ses index sont remplacés sans autre lecture historique, et une seconde application reste sans double compte

#### Scenario: Global absent en session de codage
- **WHEN** le rapport de change est amendé mais le global est absent
- **THEN** la maintenance retourne absent sans créer de rapport ni de registre

#### Scenario: Amendement d'une archive
- **WHEN** une contribution archivée déjà incluse change
- **THEN** son ancien delta est retiré puis remplacé une seule fois sans modifier les autres entrées

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

### Requirement: Réutilisation des observations CAB
Un export CAB MUST être rattaché à la racine, au change et aux contextes de
codeurs effectivement couverts. Sans couverture exhaustive attestée, les
observations partielles MUST NOT devenir des totaux exhaustifs. Le moteur MUST
dédupliquer les contextes et preuves et MUST NOT additionner un compteur natif
à son rappel dans un rapport. Il MUST NOT lire les états privés CAB ou secrets.

#### Scenario: Comptage déjà présent
- **WHEN** un export natif et un rapport décrivent le même comptage
- **THEN** une seule valeur est conservée, avec contradiction signalée si les valeurs diffèrent

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

### Requirement: Modes de publication du projet
Le moteur MUST préserver les modes des livrables existants. L'option
`--file-mode` MAY préciser le mode applicable au projet pour les rapports
et leur registre. Elle MUST refuser les modes non prévus et les permissions
spéciales. Les verrous et journaux techniques MUST rester privés.

#### Scenario: Convention CAB
- **WHEN** la publication demande explicitement le mode0775
- **THEN** les rapports et le registre publiés utilisent0775 et le retour arrière conserve les modes initiaux

### Requirement: Utilisation et interrogation agnostiques
Le moteur MUST être utilisable par toute session directe ou pilotée, par tout
agent de codage et tout orchestrateur via la même CLI et les mêmes JSON.
Il MUST accepter une identité d’agent déclarée sans liste de produits autorisés.
L’import CAB MUST rester facultatif. Les autorisations spécifiques à un
protocole MUST NOT devenir une dépendance du moteur pour les autres appelants.

#### Scenario: Agent sans CAB
- **WHEN** une session directe fournit des preuves structurées avec une identité d’agent différente de Codex ou OpenCode
- **THEN** CHANGE accepte ces preuves et produit le même rapport sans service ni identifiant CAB

### Requirement: Requête statistique sans mutation
QUERY MUST consulter le global ou une contribution archivée, éventuellement
filtrés par mesure, sans créer, recalculer ou récupérer de fichier. La réponse
MUST exposer génération, empreintes et valeurs exactes avec leurs états connus
ou indisponibles. INSPECT MUST permettre la consultation d’un rapport ouvert.

#### Scenario: Requête depuis un orchestrateur quelconque
- **WHEN** l’appelant interroge un couple publié cohérent avec QUERY et ses filtres
- **THEN** il reçoit les données et leurs empreintes en JSON sans mutation et sans déclencher REBUILD

#### Scenario: Requête sans instantané exploitable
- **WHEN** le couple est absent, divergent ou possède une transaction en attente
- **THEN** QUERY retourne une absence explicite ou une erreur sans création ni récupération implicite

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

### Requirement: SGS permanent et autonome
SGS SHALL fonctionner comme service permanent, collecter les sources natives Codex/OpenCode pour les codeurs et orchestrateurs directs/pilotés et recevoir directement les statistiques des briques. Les LLM SHALL compléter uniquement les faits non natifs. Les événements SHALL porter provenance, namespace instance et curseur de déduplication. Une source indisponible SHALL être N/A motivée. Une indisponibilité SGS SHALL ne pas bloquer le codage ; une outbox durable SHALL permettre reprise.

#### Scenario: Changement de modèle et reprise de collecte
- **WHEN** modèle/fournisseur/raisonnement change ou le collecteur redémarre
- **THEN** SGS conserve les périodes horodatées et reprend sans doublon ni perte des compteurs acquittés

#### Scenario: Historique après nettoyage
- **WHEN** les buffers d’un RUN clos sont supprimés
- **THEN** les rapports STATISTICS.md durables permettent la restitution SGS sans conserver le runtime du RUN
