---
name: sgs
description: Produire, amender et interroger les statistiques SGS d’un projet ou de ses changes, depuis une session directe ou pilotée, quel que soit son agent ou orchestrateur.
---

# SGS

Pour le suivi natif continu de CAB2.4.0, lire
[la collecte runtime](references/runtime-collection.md). Une consultation de
compteurs ou un raccordement explicite n’est pas une invocation de REBUILD.
La présence des nouvelles sources ne prouve pas leur installation/activation.

La commande canonique est `/SGS` en MAJUSCULES. Une demande manuelle de SGS
signifie toujours REBUILD pour le projet réel ciblé. Les sessions de codage
utilisent CHANGE puis DELTA ; l’absence du global ne déclenche aucune création.
Ne pas lancer CAB, OpenCode, CABU ou coding-session-statistics pour ces opérations.

Résoudre le dossier des prompts et l’index depuis DEVOPS.md du projet cible,
puis lire SGS.md et son index. Le contrat des mesures reste le prompt commun ;
le présent skill ne contient aucune copie du prompt. Lire
[le schéma](references/schema.md) pour les preuves, revues et exports natifs.

Le moteur est `../../scripts/cgpt-approval-bridge-sgs.py` depuis ce dossier de
skill. Résoudre son chemin depuis l’installation effective du plugin CAB,
jamais depuis un cache ou un chemin d’hôte supposé. Il requiert Python 3.11+,
sans dépendance externe. Vérifier VERSION avant une mutation ; ne pas lancer
une installation ou mise à jour pour corriger son absence sans mandat.

## Contrat commun à tous les agents

Le moteur est utilisable par tout agent de codage ou orchestrateur, en session
pilotée ou directe. Son interface commune est la CLI Python et ses entrées et
sorties JSON documentées, sans SDK ni session CAB requis. Les noms d’agents
sont des identités déclarées libres, jamais une liste de produits autorisés.
Le skill et la commande sont des points d’entrée facultatifs pour les clients
qui les prennent en charge ; les autres appellent la même CLI.

Pour consulter sans reconstruire, appeler explicitement le mode `QUERY`
avec `--project-root /racine --contract /prompts/SGS.md`. Sans filtre, il renvoie
l’instantané global publié ; `--metric tests` sélectionne une mesure,
`--change openspec/changes/archive/<archive>` sélectionne une contribution.
Les sorties conservent valeurs exactes, inconnues, preuves, génération et
empreintes. Un change absent du registre renvoie `not-found` ; un global absent
renvoie `absent`. QUERY ne crée aucun fichier et ne récupère pas une transaction :
un couple incohérent, un verrou occupé ou une transaction en attente est signalé.
Pour examiner le rapport d’un change ouvert ou ses extractions actuelles,
utiliser `INSPECT --project-root /racine --change openspec/changes/<change>`.
Cette consultation explicite ne constitue pas une invocation manuelle `/SGS`.

## Régénération manuelle

1. Identifier les racines de code produit depuis l’architecture autorisée.
   Passer `--code-root 'Libellé=chemin/relatif'` pour chacune, sans parent et
   sous-composant recouvrants ni copies générées. Pour un corpus purement
   documentaire, utiliser `--no-code`. Aucun langage non analysable n’est
   estimé par comptage de caractères.
2. Exécuter `INSPECT --project-root /racine`, paginé avec `--offset` et `--limit`.
   Examiner les mesures reconnues, contradictions et rapports atypiques contre
   leurs sources. Compléter les extractions manquées par une revue sourcée,
   liée à l’empreinte ; ne pas qualifier d’absent ce qui n’a pas été examiné.
3. Exécuter `REBUILD --project-root /racine --contract /prompts/SGS.md`
   avec les racines produit, le `--file-mode` prescrit par le projet et, si nécessaire, `--review .STATISTICS.review.json`.
   Le moteur supprime l’ancien global sous verrou, analyse toutes les archives,
   calcule et publie le couple. Une simple lecture accidentelle du global ne
   bloque pas cette reprise ; ne pas réutiliser ses mesures.
4. Exécuter `VERIFY --project-root /racine --contract /prompts/SGS.md --sources`.
   Reprendre les erreurs concrètes. Ne pas s’arrêter après INSPECT quand le
   calcul reste réalisable. Nettoyer les seuls fichiers de preuves/revue créés
   pour cette invocation, après publication vérifiée.

## Initialisation et continuité du suivi

Identifier dès le départ les codeurs et les orchestrateurs séparément, avec
leur rôle, agent, modèle, fournisseur et mesures disponibles. Une session
directe sans orchestration conserve cette absence ; aucun orchestrateur
fictif n’est ajouté. Les activités des deux rôles restent distinctes dans
les preuves et le rapport ; le périmètre du global reste défini par SGS.

Dès l’amorçage, après résolution des sources requises et avant l’exploration
métier, vérifier VERSION. Initialiser project_root, session_id stable et borne
native de début ; rattacher change_id dès sa sélection autorisée, avant la
première tâche. Une cible encore inconnue reste null sans créer de change, puis
la contribution avec blank() du module Python distribué. Consigner les agents
connus et les sources natives disponibles. Les mesures non collectées restent
indisponibles. Les preuves sont conservées au fil du travail dans l’historique
ou le checkpoint déjà autorisé, puis transmises sur stdin. Une reprise conserve
les identifiants et indique les lacunes ; aucune collecte rétroactive ni sonde
de pilotage en mode direct n’est déduite de cette initialisation.

## Rapports individuels dans une session de codage

L’appelant prépare les preuves en mémoire selon le schéma et les transmet à
`CHANGE --evidence -` sur stdin. Un fichier JSON explicitement réservé reste
compatible ; ne pas utiliser un fichier commun entre sessions concurrentes.
Le codeur fournit les mesures disponibles, les notes et tableaux détaillés,
avec un identifiant stable de relevé et sans mesure native inventée.

Pour rattacher un snapshot natif gelé à un rapport qui contient déjà le relevé
de cette session, appliquer la procédure « Snapshot natif ajouté à un relevé
existant » dans `references/runtime-collection.md`. Un identifiant de relevé
distinct ne crée pas une nouvelle session native.

Appeler CHANGE avec --project-root, --change et --state blocked après création
vérifiée de BLOCKERS.md, ou --state archived sur l’archive existante. Le moteur
verrouille le seul répertoire du rapport et n’accède pas à la transaction globale.
Le mandat d’écriture comprend le rapport et <rapport>.sgs-candidate uniquement.
Les anciens mandats REPORT à un fichier restent lisibles ; refaire /closing
sans accès en cours avant d’utiliser le candidat dans un tel contexte.

Pour un rapport ancien identifié, passer --report <chemin relatif existant>.
Le chemin doit rester dans le change. Une variante connue sans sélection
explicite empêche la création d’un doublon. Les six sections d’un rapport
canonique sont conservées ; une structure ancienne différente est conservée
avec une annexe de niveau3 ou inférieur. Les sessions et le contenu historique
restent présents. Une variante n’est pas admise au global par cet amendement.

Appeler ensuite `DELTA --project-root /racine --contract /prompts/SGS.md`
`--change <chemin du change>`. Le global absent produit `absent` sans création.
Le change ouvert reste exclu des agrégats historiques. Un couple incompatible
est préservé avec diagnostic et recommandation de SGS manuel, jamais reconstruit
par cette session. Un delta inchangé n’est pas appliqué deux fois.
`CHANGE --maintain-global --contract ...` enchaîne les deux modes avec leurs
protections séparées en mode direct lorsque les autorisations sont acquises.
Le succès du rapport et l’erreur éventuelle global.status=error restent distincts ;
un code0 de CHANGE ne prouve pas le succès du global. Avec le protocole CAB,
le codeur conserve le mandat REPORT du rapport et de son candidat exact ;
l’orchestrateur appelle DELTA directement sous l’autorisation statistique
distincte du prompt, hors de ce mandat et sous verrou SGS. Ne pas élargir REPORT
aux ressources globales ni créer un RUN de substitution.
Pour un autre pilotage, respecter les autorisations de son protocole sans
introduire de prérequis CAB.

## Statistiques CAB existantes

Un export public déjà autorisé de `GET /runs/<runId>/statistics` peut compléter
les mesures de production des codeurs avec `--cab-export`, après rattachement
documenté de chaque contexte à son archive et attestation de couverture complète.
Le schéma précise l’enveloppe attendue. Ne pas lire les états privés, découvrir
des credentials ni démarrer un runtime pour cela. Les observations partielles
restent partielles ; elles ne deviennent pas des totaux. Les valeurs déjà
présentes ne sont pas additionnées, et les divergences sont signalées.

## Reprise et restitution

RECOVER utilise le journal SGS existant sous le verrou commun. Si un candidat
manque mais que les états et sauvegardes sont vérifiés, restaurer l’état initial ;
un candidat divergent ou un état extérieur ambigu reste protégé. VERIFY fournit
NCA, génération, empreinte et absence de transaction ; cela ne valide pas les
tests historiques ni une livraison. Restituer le résultat réel du moteur,
les limites d’extraction et l’état des fichiers. Aucun commit ou effet Git
n’est autorisé par cette seule compétence.


## Fin du suivi et nettoyage des données CAB

Après rapport individuel vérifié et tentative de delta, suivre la clôture sûre,
le nettoyage des sessions natives, puis l’effacement terminal CAB, statistiques
du change comprises. Cela couvre la fin normale et l’arrêt pour dépendance,
avec les exceptions de reprise et la préservation des pairs du protocole.
Vérifier disque et mémoire rechargée ; conserver le rapport et le registre global.
Ne pas lire manuellement les états privés ni substituer une purge globale.
Sans état CAB utilisé, tracer non applicable sans démarrer un runtime.
Le moteur CHANGE ne purge pas ces états ; les preuves stdin ne persistent pas
et son candidat est nettoyé à la fin de la publication. Ne pas régénérer les
statistiques pour mesurer leur propre nettoyage.
