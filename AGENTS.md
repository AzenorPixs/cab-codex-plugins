# AGENTS.md — Codex Approval Bridge

Version : 0.3

## 1. Contexte

* Projet : `Codex Approval Bridge` ;
* Racine pour les agents conteneurisé : `/workspace` ;
* Racine pour les agents non conteneurisé : `/home/devops/datas/cab` ;
* Règles de sécurité et de travails des LLM : `AGENTS.md` ;
* Objectifs et architecture du projet : `PROJECT.md` ;
* Cadrage technique : `TECHNICAL.md` ;
* Cadrage de déploiement : `BUILD.md` ;
* Envrionnement de développement : `DEVOPS.md` ;

Les deux racines désignent le même projet lorsqu'un montage conteneurisé est
configuré. Toute opération DOIT utiliser la racine correspondant à son
environnement d'exécution : `/workspace` pour un agent conteneurisé ou
`/home/devops/datas/cab` pour un agent non conteneurisé.

L'agent NE DOIT PAS créer, modifier ou supprimer de fichier hors de la racine
applicable à son environnement sans validation explicite du développeur.

TECHNICAL.md et BUILD.md ne sont pas nécessairement présents, et restent complémentaires et optionnelles.

## 2. Priorité des règles

En cas de contradiction, appliquer cet ordre :

1. Demande explicite du développeur ;
2. Spécifications OpenSpec validées ;
3. Règles de sécurité et de travails des LLM : `AGENTS.md` ;
4. Objectifs et architecture du projet : `PROJECT.md` ;
5. Cadrage technique : `TECHNICAL.md` ;
6. Cadrage de déploiement : `BUILD.md` ;
7. Environnement de développement : `DEVOPS.md` ;
8. documentation officielle du projet ;
9. code existant.

Une spécification OpenSpec validée prévaut sur un code contradictoire.

La stabilité du projet prévaut sur l'optimisation.

Un `AGENTS.md` situé dans un sous-répertoire s'applique uniquement lorsqu'il est explicitement chargé ou lorsque l'agent travaille depuis ce sous-répertoire.

Il DOIT reprendre explicitement les règles générales qui doivent continuer à s'appliquer.

En cas de conflit, le `AGENTS.md` le plus proche du fichier concerné prévaut, sauf instruction explicite du développeur.

## 3. Ordre de lecture

Avant toute intervention, l'agent DOIT lire uniquement ce qui est nécessaire, dans cet ordre :

1. `AGENTS.md` ;
2. `PROJECT.md` ;
3. `TECHNICAL.md` ;
4. `BUILD.md` ;
5. `DEVOPS.md` ;
6. spécifications ou évolution OpenSpec applicables ;
7. conventions applicables du projet ;
8. code et documentation concernés.

L'agent DOIT privilégier :

* les recherches ciblées ;
* les lectures partielles ;
* les lectures incrémentales ;
* les répertoires directement concernés.

Il NE DOIT PAS parcourir récursivement l'ensemble du dépôt lorsqu'une lecture ciblée suffit.

## 4. Principes fondamentaux

L'agent DOIT privilégier :

* la stabilité ;
* la reproductibilité ;
* la simplicité ;
* la lisibilité ;
* la maintenabilité ;
* la sécurité ;
* la traçabilité ;
* la modularité ;
* la compatibilité.

L'agent DOIT réaliser la modification minimale répondant correctement à l'objectif validé.

Il DOIT préserver tout comportement existant non concerné par la demande.

Il NE DOIT PAS effectuer sans rapport avec la demande :

* de correction ;
* de refactoring ;
* d'optimisation ;
* de reformatage ;
* de renommage ;
* de réorganisation ;
* de modification de convention.

Toute amélioration non demandée DOIT être proposée séparément.

Une évolution complexe DEVRAIT être découpée en modifications indépendantes, testables et réversibles.

## 5. Méthode de travail et autorisations

Avant toute modification, l'agent DOIT :

1. comprendre la demande ;
2. consulter les éléments OpenSpec applicables ;
3. examiner l'implémentation actuelle ;
4. identifier les fichiers concernés ;
5. déterminer la modification minimale nécessaire ;
6. obtenir une validation explicite lorsqu'elle est requise.

L'agent DOIT modifier uniquement les fichiers nécessaires à l'objectif validé.

Lorsqu'une validation explicite est requise mais absente, l'agent DOIT se limiter à l'analyse et aux propositions.

Une validation explicite correspond à une demande ou confirmation claire du développeur autorisant l'action concernée.

Après modification, l'agent DOIT :

1. examiner les fichiers modifiés ;
2. vérifier leur syntaxe ;
3. exécuter les tests et vérifications applicables ;
4. vérifier la conformité OpenSpec ;
5. vérifier l'absence de modification hors périmètre ;
6. rapporter les fichiers modifiés, validations, impacts, échecs et incertitudes.

## 6. Modifications fonctionnelles et OpenSpec

OpenSpec constitue la source de vérité fonctionnelle et technique du projet.

Sources faisant autorité :

* `openspec/config.yaml`
* `openspec/changes/`
* `openspec/specs/`

L'agent DOIT consulter les spécifications applicables avant toute évolution fonctionnelle.

Il NE DOIT PAS implémenter une fonctionnalité absente d'une spécification validée, sauf autorisation explicite du développeur.

Toute évolution fonctionnelle DOIT être précédée ou accompagnée de la création ou mise à jour OpenSpec correspondante.

L'agent NE DOIT PAS créer une nouvelle évolution OpenSpec de sa propre initiative.

La création, modification, suppression ou régénération d'éléments OpenSpec nécessite :

* une demande explicite de travail sur les spécifications ;
* une validation explicite du développeur ;
* ou une commande OpenSpec explicitement demandée autorisant cette écriture.

La demande explicite d'une des commandes suivantes autorise les écritures OpenSpec nécessaires à son exécution :

* `/opsx-propose`
* `/opsx-new`
* `/opsx-continue`
* `/opsx-update`
* `/opsx-sync`
* `/opsx-archive`

### Délégation de pilotage OpenSpec

Lorsqu'un agent orchestrateur tel que CGPT pilote un agent de codage, il PEUT valider et autoriser les créations, modifications, corrections, synchronisations et archivages OpenSpec nécessaires à l'objectif demandé, à condition qu'ils respectent strictement les spécifications OpenSpec préalablement validées par le développeur.

Avant toute écriture OpenSpec, l'agent de codage DOIT présenter à l'agent orchestrateur les fichiers concernés et les modifications proposées, puis attendre sa validation explicite. La validation de l'agent orchestrateur vaut alors autorisation d'écriture dans ce périmètre.

L'agent de codage NE DOIT PAS valider seul ses modifications OpenSpec, étendre le périmètre validé, créer une évolution non demandée, ni effectuer un commit ou un push sans autorisation distincte.

Le développeur peut limiter ou révoquer cette délégation à tout moment. Ses instructions prévalent toujours.

Les spécifications OpenSpec DOIVENT rester cohérentes entre elles.

## 7. OpenCode

OpenCode est un composant technique du projet.

Les éléments suivants sont générés par OpenSpec/OpenCode et NE DOIVENT PAS être modifiés manuellement sans autorisation explicite :

* `.opencode/commands/`
* `.opencode/skills/`

Toute modification de la configuration OpenCode nécessite une validation explicite concernant OpenCode ou son intégration avec OpenSpec.

### Protocole de communication OpenCode ↔ CGPT via CAB

Ce protocole s'applique à tout agent de codage OpenCode piloté par CGPT pendant
une session de codage. Il complète les règles OpenSpec et ne les remplace pas.

#### Rôles

CGPT fixe le périmètre, valide les choix fonctionnels et techniques, décide
des mandats CAB et reçoit les comptes rendus. Le broker CAB ne décide jamais :
il transporte et corrèle les demandes. Une décision est limitée à un
`requestId` unique et à une seule opération.

L'agent de codage NE DOIT PAS étendre le périmètre, inventer une réponse CGPT
ou CAB, exécuter une opération refusée, ni déclarer exécuté un outil, une
commande ou un test sans preuve observée dans la session. Il NE DOIT PAS lire,
afficher ou transmettre de secret.

#### Initialisation de session

Avant tout accès au projet, l'agent DOIT :

1. confirmer le répertoire, le change OpenSpec et le périmètre reçus ;
2. appeler réellement l'outil MCP `broker_readiness` exposé dans la session ;
3. exiger le statut `READY` et l'absence d'approbation parasite ;
4. rapporter à CGPT l'identifiant de session, le répertoire, le change et
   l'état CAB.

Une réponse textuelle sans appel d'outil observé ne constitue jamais une
preuve. Si l'outil MCP n'est pas exposé, échoue, répond `BLOCKED` ou
`HUMAN_REQUIRED`, l'agent DOIT envoyer `CAB_BLOCKED` à CGPT et s'arrêter.

#### États de session

L'agent suit exclusivement la séquence suivante :

```text
INIT → ANALYSE → WAIT_CGPT → WAIT_CAB → EXECUTION → REPORT
                                      ↑                 │
                                      └─────────────────┘
```

* `ANALYSE` : lecture et compréhension dans le seul périmètre validé ;
* `WAIT_CGPT` : une décision fonctionnelle, technique ou de périmètre est
  attendue ;
* `WAIT_CAB` : une autorisation technique unitaire est attendue ;
* `EXECUTION` : une seule opération autorisée est réalisée ;
* `REPORT` : preuve et résultat sont transmis ;
* `DONE` : la session ne peut être clôturée que par CGPT ou après exécution de
  tous les mandats validés.

Un changement d'état ne peut jamais être déduit d'un texte produit par
l'agent lui-même.

#### Messages à destination de CGPT

Lorsqu'une décision est nécessaire, l'agent envoie l'un des messages suivants,
puis passe à `WAIT_CGPT` sans poursuivre.

```text
NDOC
change_id: <change>
objet: <question précise>
contexte: <faits observés>
impact du blocage: <ce qui ne peut pas continuer>
attente: réponse CGPT
```

```text
NFDOC
change_id: <change>
objectif: <objectif validé>
fichiers:
  - <chemin> : <modification minimale>
critères: <critères observables>
validations: <vérifications prévues>
limites: <éléments exclus>
attente: validation explicite CGPT
```

```text
NQCMOC
change_id: <change>
question: <choix à arbitrer>
A: <option et impact>
B: <option et impact>
recommandation: <option et justification>
attente: choix CGPT
```

Seule une réponse reçue dans la même session OpenCode est exploitable. Sans
réponse explicite de CGPT, l'agent reste à `WAIT_CGPT`.

#### Mandats CAB

Avant toute écriture, commande Bash ou système nécessitant une permission,
commande OpenSpec mutante, test à effet de bord, opération Docker, correction
ou archivage, l'agent soumet un mandat CAB unitaire. Il contient un
`requestId` inédit, un `approval_id`, un `change_id`, l'identifiant de session,
le répertoire et un résumé lisible.

Le mandat désigne exactement l'une des cibles suivantes :

```text
Édition :   files: ["chemin/relatif"] ; commands: []
Commande :  files: [] ; commands: ["commande complète exacte"]
```

Les mandats à plusieurs fichiers, plusieurs commandes, glob, préfixe ou
commande implicite sont interdits. Un `requestId` ne peut jamais être réutilisé.

Après soumission :

* `APPROVED` : exécuter une seule fois l'opération strictement identique ;
* `REJECTED` : ne rien exécuter, rapporter le refus et passer à `WAIT_CGPT` ;
* `needs_clarification` : ne rien exécuter et envoyer un `NDOC` ;
* réponse absente, non corrélée, `BLOCKED` ou `HUMAN_REQUIRED` : envoyer
  `CAB_BLOCKED` et s'arrêter.

Une décision CAB ne couvre jamais une autre commande, même identique.

#### Exécution, preuves et clôture

Les lectures natives ne nécessitant pas de permission peuvent être effectuées
pendant `ANALYSE`, dans le périmètre autorisé. L'agent distingue toujours les
faits observés, les déductions, les éléments non vérifiés, les refus et les
erreurs.

Après chaque mandat, l'agent envoie un `RAPPORT_OC` contenant le `requestId`,
l'opération, le résultat, les preuves réellement observées, les fichiers
modifiés, les validations exécutées, les écarts et la prochaine étape. Toute
correction, validation à effet de bord, modification OpenSpec ou archivage est
un nouveau mandat CAB.

L'agent ne coche une tâche OpenSpec qu'après preuve de son achèvement. Un
archivage OpenSpec reste un mandat distinct et exige une validation explicite
de CGPT après contrôle des critères, des tests et de la cohérence entre code,
spécifications et documentation.

## 8. Arborescence et fichiers

L'agent DOIT préserver l'arborescence et les conventions existantes.

Toute référence à un prompt ou une session renvoie automatiquement au dossier `PROMPTS/` du
projet, et à son INDEX.md pour la liste des prompts disponible.
Ce dossier et son contenu ne sont pas versionnés et sont protégés :
leur création, modification, déplacement ou suppression nécessite une
validation explicite du développeur.

Le renommage, déplacement ou la suppression d'un fichier ou répertoire nécessite une validation explicite du développeur.

Lorsqu'un fichier semble inutilisé, l'agent DOIT le signaler avant toute suppression.

Toute suppression de code existant DOIT être limitée au strict nécessaire et justifiée.

Les fichiers temporaires ou artefacts de construction explicitement régénérables PEUVENT être supprimés puis recréés lorsque nécessaire.

Les éléments versionnés ou protégés suivants NE DOIVENT PAS être supprimés ou régénérés sans validation explicite :

* `.gitignore`
* `AGENTS.md`
* `BUILD.md`
* `CHANGELOG.md`
* `DEVOPS.md`
* `LICENSE`
* `PROJECT.md`
* `README.md`
* `TECHNICAL.md`
* `.opencode/commands/`
* `.opencode/skills/`
* `.opencode/config/opencode.json`
* `openspec/config.yaml`
* `openspec/changes/`
* `openspec/specs/`

## 9. Sources du projet

Les fichiers du projet non explicitement exclus PEUVENT être utilisés comme sources :

* de code ;
* de documentation ;
* d'informations techniques ;
* d'informations fonctionnelles.

Les sources exclues NE DOIVENT PAS être lues, analysées, indexées ou utilisées :

```text id="6zj1eg"
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
.opencode/.gitignore
.opencode/cache/
.opencode/config/
.opencode/share/
.opencode/state/
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

### Inclusions explicites

Les inclusions suivantes prévalent sur les exclusions générales et PEUVENT être consultées lorsque nécessaire :

```text id="3ewy6y"
.gitignore
AGENTS.md
BUILD.md
CHANGELOG.md
DEVOPS.md
LICENSE
PROJECT.md
README.md
TECHNICAL.md
.opencode/commands/
.opencode/config/opencode.json
.opencode/skills/
openspec/AGENTS.md
openspec/config.yaml
openspec/changes/
openspec/specs/
output/
reports/
```

Ces éléments ne constituent pas nécessairement une source de vérité fonctionnelle.

Leur modification nécessite une demande ou validation explicite concernant, selon le cas :

* OpenCode ;
* OpenSpec ;
* Git ;
* la production de rapports techniques.

`output/` et `reports/` :

* PEUVENT être lus ;
* NE DOIVENT PAS être considérés comme source de vérité ;
* NE DOIVENT PAS être versionnés dans Git ;
* NE DOIVENT être créés, modifiés ou supprimés que pour une demande explicite.

## 10. Secrets

L'agent NE DOIT PAS :

* ouvrir un fichier sensible ;
* transmettre un secret au modèle ;
* analyser un secret ;
* indexer un secret ;
* ajouter un secret à Git ;
* afficher un secret dans les journaux ou sorties.

Les données sensibles comprennent notamment :

* mots de passe ;
* clés privées ;
* clés SSH ;
* jetons d'API ;
* certificats ;
* identifiants de connexion.

Pour un fichier sensible, l'agent PEUT uniquement signaler sa présence à partir de son nom ou chemin.

Les secrets DOIVENT rester hors des sources versionnées et accessibles aux agents.

Un emplacement local tel que `.opencode/share/` PEUT contenir des secrets uniquement s'il est exclu :

* de Git ;
* de la lecture par les agents ;
* de l'indexation.

## 11. Sécurité

L'agent DOIT privilégier :

* le principe du moindre privilège ;
* la validation des entrées ;
* la gestion explicite des erreurs ;
* des permissions minimales ;
* l'absence de données sensibles dans les journaux.

L'agent NE DOIT PAS supposer disposer d'un accès complet à la machine hôte.

Sans validation explicite, il NE DOIT PAS modifier :

* les montages Docker ;
* les volumes ;
* les utilisateurs du conteneur ;
* les droits d'accès du conteneur ;
* les permissions accordées au conteneur.

## 12. Git

Sans validation explicite du développeur, l'agent NE DOIT PAS :

* modifier `.git/` ;
* réécrire l'historique ;
* supprimer des commits ;
* effectuer un push ;
* modifier la configuration Git du dépôt ;
* créer, modifier ou supprimer des branches ;
* modifier les sous-modules ;
* créer ou modifier des hooks Git.

Les commits DOIVENT être atomiques.

Un commit DOIT correspondre à une modification clairement identifiable.

Un commit NE DOIT PAS mélanger des modifications indépendantes de type :

* correction ;
* refactoring ;
* évolution fonctionnelle ;
* documentation.

Avant toute proposition de commit, l'agent DOIT :

1. vérifier la syntaxe ;
2. examiner les fichiers modifiés ;
3. vérifier que seuls les fichiers attendus sont modifiés ;
4. vérifier qu'aucun secret n'a été ajouté ;
5. exécuter les vérifications disponibles ;
6. décrire clairement le contenu du commit.

## 13. Bash et Shell

Les scripts DOIVENT rester compatibles avec la version de Bash fournie par les versions Debian supportées.

Les constructions POSIX DEVRAIENT être privilégiées lorsqu'elles permettent simplement le même résultat.

Une fonctionnalité spécifique à une version récente de Bash nécessite une justification claire.

Pour Bash, les vérifications minimales sont :

```bash id="8vhj9b"
bash -n <fichier>
shellcheck <fichier>
```

Les scripts DOIVENT :

* protéger les variables par des guillemets lorsque nécessaire ;
* gérer explicitement les échecs attendus ;
* détecter, traiter et signaler clairement les erreurs ;
* NE JAMAIS ignorer silencieusement une erreur ;
* préserver les comportements existants non concernés.

## 14. Variables

Les variables de configuration DOIVENT rester cohérentes avec les spécifications.

Les noms existants suffisamment explicites DOIVENT être conservés.

Les renommages purement esthétiques sont interdits.

Les valeurs codées en dur DOIVENT être évitées lorsque cela est raisonnable.

Une variable existante DOIT être réutilisée lorsqu'elle répond déjà au besoin.

Toute nouvelle variable de configuration DOIT être documentée dans OpenSpec.

Conventions :

* globale : `MAJUSCULE`
* locale : `minuscule`
* séparateur : `_`
* nouvelles variables : anglais

Pour toutes les spécifications techniques générales, se référer au fichier TECHNICAL.md.

## 15. Chemins, compatibilité et portabilité

L'agent DOIT privilégier les chemins relatifs au projet lorsqu'ils préservent la portabilité.

Les chemins absolus DEVRAIENT être utilisés uniquement lorsqu'ils sont imposés par le projet.

Toute modification DOIT préserver la compatibilité avec :

* les installations existantes ;
* les versions stables de Debian supportées.

Toute incompatibilité DOIT être explicitement signalée et spécifiée.

Toute dépendance spécifique à une distribution ou version DOIT être documentée.

## 16. Idempotence

Les scripts d'installation DEVRAIENT être idempotents lorsque raisonnablement possible.

Une nouvelle exécution NE DOIT PAS provoquer d'effets de bord inattendus.

## 17. Dépendances

L'agent DEVRAIT privilégier les outils disponibles dans une installation Debian standard.

Une dépendance existante DOIT être réutilisée lorsqu'elle répond au besoin.

Toute nouvelle dépendance nécessite :

* une justification ;
* une validation explicite du développeur ;
* une documentation.

## 18. Conventions et style

L'agent DOIT respecter les conventions existantes :

* nommage ;
* organisation ;
* formatage ;
* architecture.

Une convention existante NE DOIT PAS être modifiée sans validation explicite.

En cas d'ambiguïté, l'agent DOIT privilégier la cohérence avec le code existant.

Il DEVRAIT privilégier :

* les fonctions courtes ;
* les noms explicites ;
* une indentation homogène ;
* les commentaires utiles ;
* les traitements simples ;
* le principe KISS.

La simplicité prévaut sur l'optimisation prématurée.

Les commentaires existants DOIVENT être conservés lorsqu'ils restent exacts.

Un nouveau commentaire DOIT apporter une information utile et ne pas simplement répéter le code.

L'agent NE DOIT PAS introduire `TODO`, `FIXME` ou `HACK` sans validation explicite.

Un travail incomplet DEVRAIT être représenté dans OpenSpec plutôt que laissé sous forme de marqueur dans le code.

## 19. Documentation, encodage et licences

Toute évolution importante DOIT mettre à jour, lorsque nécessaire :

* les spécifications ;
* la documentation ;
* les commentaires concernés.

La documentation sans rapport avec la demande NE DOIT PAS être modifiée.

Tous les fichiers texte DOIVENT utiliser :

* UTF-8 ;
* fins de ligne Unix LF.

Les fins de ligne CRLF NE DOIVENT PAS être introduites.

Les en-têtes de licence existants DOIVENT être conservés.

Aucune licence NE DOIT être modifiée sans validation explicite.

## 20. Messages et robustesse

Les messages des scripts DOIVENT être :

* explicites ;
* cohérents ;
* utiles au suivi ;
* utiles au diagnostic.

Ils NE DOIVENT PAS :

* masquer un échec ;
* ignorer silencieusement une erreur ;
* exposer des données sensibles ;
* modifier le comportement fonctionnel attendu.

Le code DEVRAIT privilégier :

* une gestion explicite des erreurs ;
* des messages d'erreur compréhensibles ;
* des codes de retour explicites ;
* la validation des entrées ;
* l'idempotence lorsque pertinente.

## 21. Tests et validation finale

Lorsqu'un mécanisme de test existe, l'agent DOIT exécuter les tests applicables avant de déclarer le travail valide.

Pour Bash, les vérifications minimales sont :

```bash id="h2j28x"
bash -n
shellcheck
```

Avant de déclarer une modification valide, l'agent DOIT vérifier :

* la syntaxe ;
* l'absence d'erreur évidente ;
* la cohérence des fichiers modifiés ;
* la conformité avec OpenSpec ;
* l'absence de modification hors périmètre.

L'agent NE DOIT JAMAIS déclarer qu'un test ou une vérification a réussi s'il ne l'a pas réellement exécuté avec succès.
