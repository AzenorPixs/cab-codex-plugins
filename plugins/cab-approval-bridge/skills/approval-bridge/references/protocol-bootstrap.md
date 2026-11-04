# Entrée et cycle de pilotage — CAB 2.2.27

## Bootstrap prioritaire du monitoring

Dès la résolution du workspace absolu canonique, appliquer intégralement
`monitor-service.md` du skill CAB installé, avant PLLM, santé
OpenCode et prévols modèle/MCP. Ce passage est obligatoire à chaque entrée
ou reprise de session de codage pilotée, même si le contrôleur et le superviseur
sont déjà actifs et réutilisés. Ne pas se limiter au constat d'une unité absente :
si elle est inactive ou absente dans le périmètre autorisé, installer son jeu
indépendant, puis exécuter `systemctl --user daemon-reload` et
`systemctl --user start cgpt-approval-bridge-monitor.service` séparément.
Réutiliser une instance active conforme sans modification ni redémarrage.
Vérifier service actif, GET /api/identity avec version et identity.workspace
attendus, puis GET / ; terminer cette tentative bornée et rapporter son résultat
avant les contrôles amont. Afficher l'URL réelle uniquement après ces preuves,
sinon la cause et l'URL attendue séparément du statut CAB. Préserver configuration
et port existants, sans activation au login. Un échec PLLM ou CAB ultérieur
n'arrête pas le moniteur. Une divergence active ou un échec de monitoring ne
permet aucun arrêt, redémarrage ou changement de RUN dans les autres briques.

## Ordre de lecture et place de la Development Map

Pour les seules sources nécessaires au périmètre autorisé, les deux agents
appliquent l’ordre de lecture d’`AGENTS.md` :

1. `AGENTS.md` ;
2. `PROJECT.md` ;
3. `TECHNICAL.md` ;
4. `BUILD.md` ;
5. `DEVOPS.md` ;
6. `DEVELOPMENT_MAP.md` à la racine, pour les lots, changes et dépendances concernés ;
7. la configuration, les spécifications et les changes OpenSpec applicables ;
8. les conventions applicables du projet ;
9. le code, les tests et la documentation concernés, dont `README.md` si nécessaire.

`DEVELOPMENT_MAP.md` fait partie des cadrages du projet cible. Cette synthèse
de navigation et d’aide à la décision relie les codes de lot, les changes actifs
et archivés, leurs ensembles et sous-ensembles, dépendances et avancements.
Sa lecture après `DEVOPS.md` et avant OpenSpec ne change pas la priorité des
sources de vérité et des preuves. Revérifier les informations déterminantes
contre les artefacts OpenSpec, les preuves accessibles et les `BLOCKERS.md`
applicables ; signaler toute divergence et la résoudre avant d’utiliser
l’information concernée. Distinguer avancement documentaire, réalisabilité,
validation, livraison et activation.

Lorsqu’un choix de change relève du prompt, respecter d’abord la cible,
les priorités explicites, le périmètre et les réservations. Privilégier les
travaux dont les prérequis sont vérifiés, puis un nombre et une difficulté
faibles de dépendances non satisfaites, avant l’effet de déblocage documenté.
La carte ne remplace ni l’inventaire des candidats ni les validations requises.

Si la carte est absente, vide ou réduite à un squelette, y compris à son nom
et au nom du projet, le signaler et recommander `ACL`, en mode direct,
sans le lancer automatiquement. Poursuivre le travail autorisé à partir des
sources et preuves accessibles, sans créer ni remplir la carte. Un fichier
illisible reste `NON VÉRIFIABLE` ; il n’est pas assimilé à une absence.
Une carte partielle exploitable conserve ses informations vérifiées, sans
reconstruction globale. Sa création ou sa complétion globale attend la
validation explicite prévue par ACL. Les amendements ciblés éventuels restent
soumis aux autorisations du seul prompt applicable ; en pilotage, l’agent de
codage les propose puis les réalise sous mandat CAB unitaire distinct après
validation explicite de l’orchestrateur, dans les ressources autorisées.

L’orchestrateur inclut cet ordre dans les mandats de lecture, au démarrage
et lors des nouvelles lectures nécessaires à une reprise ou à un compactage.
Il respecte le bootstrap prioritaire du monitoring et les préconditions CAB
avant les lectures de l’agent de codage. La lecture préalable de ce protocole
avant l’initialisation reste requise. Ces règles n’étendent ni le périmètre,
ni les validations, ni les écritures autorisées et ne déclenchent aucun RUN.

## Étapes du cycle et observation web

Charger la référence distribuée `run-lifecycle.md` du skill
approval-bridge pour le catalogue des onze étapes. Après armement, lire la
séquence courante du job puis déclarer chaque étape examinée par
`POST /runs/<run_id>/job/progress` avec stepId, stepStatus et
expectedStepSequence. Un retour de Vérifications ou Revue vers Implémentation
est autorisé et historisé. Les étapes non renseignées ne sont jamais déduites
du texte libre, du mandat ou de la phase. ETAT, étape, phase technique et
cases de tâches restent distincts ; aucune déclaration ne vaut permission ou
gate terminal. Les jobs anciens sans lifecycle restent compatibles.
