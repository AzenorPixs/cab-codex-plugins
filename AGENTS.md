# AGENTS.md — Codex Approval Bridge

Version : 1.3

## 1. Contexte

Projet : `Codex Approval Bridge`. Racine : `/home/devops/datas/cab`.

Références :
* `AGENTS.md` : sécurité et règles de travail des LLM ;
* [CODING_RULES.md](CODING_RULES.md) : règles générales par langage ;
* `PROJECT.md` : objectifs et architecture ;
* `TECHNICAL.md` : cadrage technique ;
* `BUILD.md` : déploiement ;
* `DEVOPS.md` : environnement de développement ;
* `DEVELOPMENT_MAP.md` : cartographie et progression ;
* section 7 : pilotage résolu depuis le référentiel des prompts de `DEVOPS.md`.

`CODING_RULES.md` fait partie du socle commun et DOIT accompagner `AGENTS.md`
lors de toute distribution autorisée.

La propagation des règles conserve l'identité et la racine du consommateur.
Toute adaptation locale ou propagation à d'autres consommateurs nécessite
l'autorisation applicable, sans modification implicite du référentiel.

`DEVOPS.md`, généré automatiquement, décrit l'environnement local observé
à sa génération. Après toute régénération, l'agent DOIT relire les éléments
nécessaires avant de les réutiliser.

`DEVELOPMENT_MAP.md` est un document de cadrage et d'aide au choix des changes.
Il relie lots, changes OpenSpec actifs et archivés, ensembles et sous-ensembles
fonctionnels ou techniques, dépendances et avancement vérifiable.

Il distingue documentation, réalisabilité, validations, livraison et activation,
avec sources identifiées et preuves datées. Priorité :
1. prérequis vérifiés ;
2. nombre et difficulté faibles de dépendances non satisfaites ;
3. capacité à débloquer d'autres travaux.

La cartographie ne lance aucune session ni ne remplace les validations requises.
Les informations déterminantes DOIVENT être revérifiées avant engagement.

Toute création, modification ou suppression de fichier hors de la racine
applicable à l'environnement nécessite la validation explicite du développeur.

## 2. Priorité des règles

En cas de contradiction, appliquer cet ordre :
1. demande explicite du développeur ;
2. spécifications OpenSpec validées ;
3. `AGENTS.md` et son extension `CODING_RULES.md` ;
4. `PROJECT.md` ;
5. `TECHNICAL.md` ;
6. `BUILD.md` ;
7. `DEVOPS.md` ;
8. documentation officielle du projet ;
9. code existant.

`CODING_RULES.md` conserve la priorité des règles extraites d'`AGENTS.md`.
En cas de contradiction entre les deux, `AGENTS.md` prévaut.

Un prompt explicitement demandé prévaut sur les fichiers de cadrage,
dans les limites du mandat et des restrictions explicites du développeur.
La stabilité prévaut sur l'optimisation.

Sous réserve des priorités supérieures, `DEVOPS.md` fait autorité pour
les outils de développement, construction, test et validation (§13.1).

`DEVELOPMENT_MAP.md` reste subordonné aux sources de vérité et preuves
applicables, sans modifier leur priorité. Toute divergence DOIT être
signalée et résolue avant utilisation de l'information concernée.

Avant toute intervention sur un fichier, charger les `AGENTS.md` applicables
à son chemin. Les règles générales restent applicables ; les règles locales
les complètent ou les précisent. En cas de conflit,
le plus proche du fichier concerné prévaut, sauf instruction explicite
du développeur.

## 3. Ordre de lecture

Avant toute intervention, l'agent DOIT limiter ses lectures au nécessaire,
dans cet ordre :
1. `AGENTS.md` ;
2. `PROJECT.md` ;
3. `TECHNICAL.md` ;
4. `BUILD.md` ;
5. `DEVOPS.md` ;
6. `DEVELOPMENT_MAP.md` : lots, changes et dépendances concernés ;
7. spécifications ou évolution OpenSpec applicables ;
8. `CODING_RULES.md`, sections des langages concernés, puis conventions applicables ;
9. code et documentation concernés.

Si `DEVELOPMENT_MAP.md` est absent, vide ou squelettique, l'agent DOIT
poursuivre le travail autorisé avec les sources et preuves accessibles.
Ce constat n'autorise aucune création ni complétion.

Créer, reconstruire ou compléter globalement la cartographie nécessite
une validation explicite. Les amendements ciblés d'une cartographie
exploitable restent soumis aux autorisations du processus applicable.

L'agent DOIT privilégier les recherches ciblées et les lectures partielles
et incrémentales dans les répertoires concernés. Tout parcours récursif
de l'ensemble du dépôt est interdit lorsqu'une lecture ciblée suffit.

Il DOIT minimiser les tokens d'entrée et de sortie par ces pratiques,
des échanges concis et la réutilisation des informations obtenues.
Si le fournisseur et l'outil le permettent, il DOIT optimiser l'écriture
et la réutilisation du cache de prompt : instructions et éléments
réutilisés stables, données variables séparées. Aucune mise en cache
ni économie ne doit être supposée sans mesure.

Ces efforts DOIVENT préserver qualité, sécurité, autorisations, preuves
et vérifications requises.

## 4. Principes fondamentaux

L'agent DOIT privilégier stabilité, reproductibilité, simplicité, lisibilité,
maintenabilité, sécurité, traçabilité, modularité et compatibilité.

Il DOIT limiter les modifications au minimum nécessaire à l'objectif validé
et préserver les comportements non concernés.

Toute correction, refactoring, optimisation, reformatage, renommage,
réorganisation ou modification de convention sans rapport avec la demande
est interdit. Toute amélioration non demandée DOIT être proposée séparément.

Une évolution complexe DEVRAIT être découpée en modifications indépendantes,
testables et réversibles.

## 5. Méthode de travail et autorisations

Avant modification, l'agent DOIT comprendre la demande, consulter OpenSpec
applicable, examiner l'existant, identifier les fichiers nécessaires,
définir la modification minimale et obtenir les validations requises.

Une validation explicite est une demande ou confirmation claire du développeur
autorisant l'action concernée. Elle reste valable dans son périmètre tant que
ses conditions demeurent réunies et qu'elle n'est pas révoquée.
Si elle est requise mais absente, l'agent DOIT se limiter à l'analyse
et aux propositions.

Il DOIT modifier uniquement les fichiers nécessaires à l'objectif validé.

Après modification, il DOIT examiner les fichiers modifiés, vérifier leur
syntaxe, exécuter les tests et contrôles applicables, vérifier la conformité
OpenSpec et l'absence de modification hors périmètre, puis rapporter fichiers
modifiés, validations, impacts, échecs et incertitudes.

## 6. Modifications fonctionnelles et OpenSpec

OpenSpec est la source de vérité fonctionnelle et technique :
`openspec/config.yaml`, `openspec/changes/`, `openspec/specs/`.

Avant toute évolution fonctionnelle, l'agent DOIT consulter les spécifications
applicables. Toute évolution DOIT être précédée ou accompagnée de la création
ou mise à jour OpenSpec correspondante. Implémenter une fonctionnalité absente
d'une spécification validée nécessite l'autorisation explicite du développeur.

Toute création, modification, suppression ou régénération OpenSpec nécessite
une demande explicite sur les spécifications, une validation explicite du
développeur ou une commande explicitement demandée autorisant l'écriture.
Aucune nouvelle évolution ne peut être créée de sa propre initiative.

Les commandes `/opsx-propose`, `/opsx-new`, `/opsx-continue`, `/opsx-update`,
`/opsx-sync` et `/opsx-archive` explicitement demandées autorisent les écritures
nécessaires à leur exécution.

En session pilotée, l'orchestrateur PEUT autoriser les écritures OpenSpec
nécessaires à l'objectif demandé, dans le strict respect des spécifications
validées par le développeur et selon le protocole défini en section 7.
Cette délégation est limitée ou révocable par le développeur et n'autorise
aucun élargissement de périmètre, commit ou push sans autorisation distincte.

Les spécifications OpenSpec DOIVENT rester cohérentes entre elles.

## 7. Sessions pilotées et archivage

Toute session pilotée DOIT appliquer le prompt explicitement demandé,
résolu depuis le dossier et l'index de prompts indiqués dans `DEVOPS.md`.
Le cadrage du codeur est résolu par l'entrée `ACSP` de cet index.
Les deux agents DOIVENT connaître les obligations applicables avant exécution.
Ces références complètent les règles du projet sans étendre les autorisations
du développeur.

Avant toute intervention sur l'intégration d'un agent, l'agent DOIT consulter
les [règles d'intégration](AGENT_INTEGRATIONS.md). Toute modification
de sa configuration ou modification manuelle de ses fichiers générés
nécessite une validation explicite.

Après chaque archivage OpenSpec autorisé et réussi, le processus CAB génère
ou amende STATISTICS.md dans le change, puis le global du projet. Le LLM ne
calcule ni ne rédige ces rapports. Les fichiers locaux des changes restent la
seule source de vérité ; PG est leur projection. Consulter le contrat installé
CAB et vérifier les reçus, sans reconstruire de preuve absente. Un échec reprend
seulement la génération, sans réarchiver ni perdre l’historique.

## 8. Arborescence et fichiers

L'agent DOIT préserver l'arborescence et les conventions existantes.
Les références aux prompts et sessions DOIVENT être résolues à partir
des emplacements de sources et d'index indiqués dans `DEVOPS.md`.

Renommer, déplacer ou supprimer un fichier ou répertoire nécessite
la validation explicite du développeur. Tout fichier présumé inutilisé
DOIT être signalé avant suppression ; toute suppression de code
DOIT être strictement nécessaire et justifiée.

Exception : les fichiers temporaires et artefacts de construction
explicitement régénérables PEUVENT être supprimés puis recréés si nécessaire.

Cette exception ne permet pas de supprimer ou régénérer sans validation
explicite les éléments protégés suivants :
* `.gitignore`, `AGENTS.md`, `CODING_RULES.md`, `BUILD.md`, `CHANGELOG.md`, `DEVOPS.md`,
  `DEVELOPMENT_MAP.md`, `LICENSE`, `PROJECT.md`, `README.md`, `TECHNICAL.md` ;
* `project.env` à la racine ;
* `openspec/config.yaml`, `openspec/changes/`, `openspec/specs/`.

Les protections propres aux intégrations d'agents sont définies dans
leurs règles d'intégration, à consulter conformément à la section 7.

L'agent NE DOIT PAS créer, modifier ou régénérer `project.env`.
Seule l'extraction locale filtrée prévue en section « Sources du projet »
est autorisée pour les variables utiles au travail autorisé.

## 9. Sources du projet

Les fichiers non exclus PEUVENT servir de sources de code, documentation
et informations techniques ou fonctionnelles.

Les sources exclues NE DOIVENT PAS être lues, analysées, indexées ou utilisées,
sauf accès local nécessaire au travail autorisé selon la section « Secrets »
ou extraction filtrée définie ci-dessous.

Exclusions :
```text
__pycache__/
**/*.crt
**/*.cer
**/*.der
**/*.env
**/*.env.*
**/*.key
**/*.pem
**/*.p12
**/*.pfx
**/credentials.json
**/credentials.yaml
**/id_rsa
**/id_ed25519
**/secrets.json
**/secrets.yaml
.cache/
.git/
.idea/
.mypy_cache/
.npm/
.pytest_cache/
.ruff_cache/
.venv/
.python-version
.stfolder/
.stignore
.vscode/
credentials.json
credentials.yaml
id_rsa
id_ed25519
env/
logs/
node_modules/
openspec/.cache/
openspec/.env
openspec/.env.*
openspec/.generated/
openspec/.history/
openspec/.output/
openspec/.tmp/
openspec/build/
openspec/dist/
openspec/logs/
secrets.json
secrets.yaml
tmp/
venv/
```

Les exclusions et inclusions propres aux intégrations d'agents DOIVENT
être définies dans leurs règles d'intégration, consultées avant tout accès.

### Extraction filtrée de `project.env`

Sauf interdiction explicite du développeur, une extraction locale filtrée
des variables utiles au travail autorisé est permise sans validation
supplémentaire ni invocation d'un prompt. Elle concerne uniquement
`project.env` à la racine et déroge à l'exclusion des `.env` pour ce traitement.

Seul le processus local parcourt le fichier. L'agent reçoit uniquement
les noms et valeurs établis comme non secrets et utiles. Cela peut inclure
`PROJECT_*`, `LOCAL_DEFAULT_BRANCH`, `GIT_*`, `REMOTE_*` ou d'autres variables :
aucun nom ni préfixe ne garantit l'absence de secret, notamment dans les URL.

Seules les affectations littérales sur une ligne sont acceptées.
Les clés dupliquées et syntaxes nécessitant une interprétation sont ambiguës.
Toute exécution ou tout chargement dans l'environnement est interdit :
`source`, `eval`, substitutions de commandes et interpolations compris.

Les valeurs secrètes ou incertaines sont exclues de toute restitution,
journalisation, copie, indexation ou transmission au modèle.
Aucune ligne rejetée ni sortie brute ne DOIT être restituée.

Si le fichier est absent ou inaccessible, ou une variable nécessaire
absente, vide ou ambiguë, demander uniquement la valeur manquante
ou non vérifiable au développeur.

L'agent NE DOIT PAS créer, modifier ou régénérer `project.env`.
Les autres accès sensibles relèvent de la section « Secrets ».

### Inclusions explicites

Ces inclusions prévalent sur les exclusions générales pour les lectures
nécessaires, sans conférer le statut de source de vérité fonctionnelle :

```text
.gitignore
AGENTS.md
CODING_RULES.md
BUILD.md
CHANGELOG.md
DEVOPS.md
DEVELOPMENT_MAP.md
LICENSE
PROJECT.md
README.md
TECHNICAL.md
project.env
openspec/AGENTS.md
openspec/config.yaml
openspec/changes/
openspec/specs/
output/
reports/
```

Pour `project.env`, seule l'extraction filtrée ci-dessus est autorisée.

Toute modification nécessite la demande ou validation explicite applicable :
intégration d'agent, OpenSpec, Git ou production de rapports techniques.

`output/` et `reports/` sont lisibles, sans autorité de vérité, et NE DOIVENT
PAS être versionnés. Leur création, modification ou suppression nécessite
une demande explicite.

## 10. Secrets

L'ouverture locale des fichiers sensibles est autorisée uniquement pour
les besoins du projet et du travail autorisé. Seuls leur nom ou chemin
PEUVENT être signalés ; aucun contenu contenant des secrets ne DOIT être
restitué.

Les secrets, notamment mots de passe, clés privées ou SSH, jetons d'API,
certificats et identifiants de connexion, NE DOIVENT PAS être transmis
au modèle, indexés, versionnés ni affichés dans les journaux ou sorties.

Tout stockage local de secrets DOIT être exclu de Git et de l'indexation.

Pour `project.env`, appliquer exclusivement les règles de la section
« Sources du projet » : extraction locale filtrée des variables utiles
établies comme non secrètes ; aucune restitution brute ni ligne rejetée ;
création, modification et régénération interdites.

## 11. Sécurité

L'agent DOIT appliquer le moindre privilège, valider les entrées et gérer
explicitement les erreurs, sans données sensibles dans les journaux.
Il NE DOIT PAS supposer un accès complet à l'hôte.

Toute modification des montages Docker, volumes, utilisateurs, droits
d'accès ou permissions du conteneur nécessite une validation explicite.

## 12. Git

Sans validation explicite du développeur, l'agent NE DOIT PAS modifier
`.git/`, l'historique, les sous-modules ou la configuration Git du dépôt,
supprimer des commits, effectuer un push, créer/modifier/supprimer
des branches ni créer/modifier des hooks Git.

Chaque commit DOIT être atomique et correspondre à une modification
clairement identifiable, sans mélanger des corrections, refactorings,
évolutions fonctionnelles ou documentations indépendants.

Avant toute proposition de commit, l'agent DOIT examiner les fichiers
modifiés, vérifier la syntaxe, le périmètre attendu et l'absence de secret
ajouté, exécuter les vérifications disponibles et décrire le contenu du commit.

## 13. Programmation et validation

Avant toute modification, l'agent DOIT consulter dans
[CODING_RULES.md](CODING_RULES.md) les sections des langages concernés,
puis appliquer les conventions du projet définies dans `TECHNICAL.md`
et les outils et configurations de `DEVOPS.md`.

### 13.1. Règles communes

Sous réserve des priorités supérieures, les outils et configurations
de développement, construction, test et validation DOIVENT respecter
`DEVOPS.md`.

Tout outil nécessaire absent de ce référentiel nécessite l'accord explicite
du développeur avant installation ou utilisation, avec rôle et justification.
Sa disponibilité ne vaut pas autorisation. Tout outil prescrit indisponible
DOIT être signalé ; sa substitution nécessite le même accord.
Seules les opérations dépendantes restent en attente.
Cela n'autorise ni modification ni régénération de `DEVOPS.md`.

Le code DOIT respecter les versions supportées des langages, runtimes
et dépendances, déterminées par les spécifications et configurations
du projet, notamment `pyproject.toml`, `package.json` et `DEVOPS.md`.
Une version locale plus récente ne relève pas implicitement le minimum
supporté. Toute exigence de version supérieure DOIT être justifiée
et soumise aux validations applicables.

Le code DOIT respecter conventions et architecture, préserver les
comportements non concernés, valider les entrées aux frontières du système,
gérer les échecs attendus, détecter, traiter ou propager les erreurs sans
les masquer, fournir des diagnostics compréhensibles sans secret et libérer
les ressources, même en cas d'échec.

Tout ajout d'outil, dépendance ou langage reste soumis aux autorisations
applicables. La syntaxe seule ne prouve pas la validité fonctionnelle :
les tests applicables sont obligatoires. Toute vérification indisponible,
non exécutée ou échouée DOIT être signalée.

## 14. Variables

Les variables de configuration DOIVENT respecter les spécifications.
Réutiliser toute variable existante adaptée et conserver les noms
suffisamment explicites ; les renommages purement esthétiques sont interdits.
Éviter les valeurs codées en dur lorsque raisonnable.

Toute nouvelle variable de configuration DOIT être documentée dans OpenSpec.

Conventions : globales en `MAJUSCULE`, locales en `minuscule`,
séparateur `_`, nouvelles variables en anglais.
Pour les spécifications techniques générales, consulter `TECHNICAL.md`.

## 15. Chemins, compatibilité et portabilité

Privilégier les chemins relatifs préservant la portabilité ; réserver
autant que possible les chemins absolus aux exigences du projet.

Toute modification DOIT rester compatible avec les installations existantes
et les versions stables de Debian supportées. Toute incompatibilité DOIT
être explicitement signalée et spécifiée ; toute dépendance propre
à une distribution ou version DOIT être documentée.

## 16. Idempotence

Les scripts d'installation DEVRAIENT être idempotents lorsque raisonnable.
Toute réexécution NE DOIT PAS provoquer d'effets de bord inattendus.

## 17. Dépendances

Privilégier les outils d'une installation Debian standard.
Toute dépendance existante adaptée DOIT être réutilisée.
Toute nouvelle dépendance nécessite justification, validation explicite
du développeur et documentation.

## 18. Conventions et style

Les conventions existantes de nommage, organisation, formatage et architecture
DOIVENT être respectées ; leur modification nécessite une validation explicite.
En cas d'ambiguïté, privilégier la cohérence avec le code existant.

Privilégier fonctions courtes, noms explicites, indentation homogène,
commentaires utiles et traitements simples (KISS).
La simplicité prévaut sur l'optimisation prématurée.

Les commentaires encore exacts DOIVENT être conservés ; tout nouveau
commentaire DOIT apporter une information utile sans simplement répéter le code.

Introduire `TODO`, `FIXME` ou `HACK` nécessite une validation explicite.
Un travail incomplet DEVRAIT être représenté dans OpenSpec plutôt que
par un marqueur dans le code.

## 19. Documentation, encodage et licences

Toute évolution importante DOIT actualiser, si nécessaire, les spécifications,
la documentation et les commentaires concernés. Toute modification
documentaire sans rapport avec la demande est interdite.

Les fichiers texte DOIVENT être en UTF-8 avec fins de ligne Unix LF,
sans introduction de CRLF.

Les en-têtes de licence existants DOIVENT être conservés.
Toute modification de licence nécessite une validation explicite.

## 20. Messages et robustesse

Les messages des scripts DOIVENT être explicites, cohérents et utiles
au suivi et au diagnostic, sans masquer d'échec, ignorer silencieusement
d'erreur, exposer de données sensibles ni modifier le comportement attendu.

Le code DEVRAIT privilégier la gestion explicite des erreurs, des messages
compréhensibles, des codes de retour explicites, la validation des entrées
et l'idempotence lorsque pertinente.

## 21. Tests et validation finale

Avant de déclarer le travail valide, l'agent DOIT exécuter les tests
applicables lorsqu'un mécanisme existe, vérifier la syntaxe, l'absence
d'erreur évidente, la cohérence des fichiers modifiés, la conformité
OpenSpec et l'absence de modification hors périmètre.

Aucun test ni contrôle ne DOIT être déclaré réussi sans exécution
effective avec succès.
