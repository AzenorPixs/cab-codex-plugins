---
name: sgs
description: Produire, amender et interroger les statistiques SGS d’un projet ou de ses changes, depuis une session directe ou pilotée, quel que soit son agent ou orchestrateur.
---

# SGS

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

## Rapports individuels dans une session de codage

Le codeur prépare uniquement les preuves structurées disponibles dans
`.STATISTICS.session.json` à la racine du projet, selon le schéma, avec les tableaux, notes et métadonnées d’agents disponibles
au moins aussi détaillés que les références Pixs. Aucune mesure
native manquante n’est inventée. Utiliser un identifiant de relevé stable ; un
nouveau relevé corrigé reçoit un identifiant distinct et conserve le précédent.

Appeler `CHANGE --project-root /racine --change openspec/changes/<change>`
`--state blocked --evidence .STATISTICS.session.json` après création vérifiée
de BLOCKERS.md. À l’archivage réussi, le chemin devient
`openspec/changes/archive/<archive>` et l’état `archived`. Le même rapport est
amendé dans ses six sections, avec historique et portée cumulative/incrémentale.
Un rapport historique incompatible exige une adaptation ciblée des preuves,
sans effacement de son contenu. Vérifier les six sections et l’état réel.

Appeler ensuite `DELTA --project-root /racine --contract /prompts/SGS.md`
`--change <chemin du change>`. Le global absent produit `absent` sans création.
Le change ouvert reste exclu des agrégats historiques. Un couple incompatible
est préservé avec diagnostic et recommandation de SGS manuel, jamais reconstruit
par cette session. Un delta inchangé n’est pas appliqué deux fois.
`CHANGE --maintain-global --contract ...` enchaîne les deux modes sous le même
verrou en mode direct lorsque les mêmes autorisations sont acquises. Avec le protocole CAB,
conserver CHANGE et DELTA sous leurs mandats distincts et leurs réservations.
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
