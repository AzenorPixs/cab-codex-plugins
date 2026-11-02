# Statistiques et nettoyage final — CAB 2.2.3

## Statistiques des sessions pilotées

Le présent protocole centralise la collecte, la génération et la vérification
des statistiques des sessions pilotées, quel que soit le prompt invoqué.
Les prompts y renvoient pour ces procédures et conservent leurs objectifs,
périmètres, autorisations métier et conditions de réussite. Cette règle ne
déclenche aucun pilotage dans une session directe.

### Déclenchement et emplacement du rapport

Pour chaque change du périmètre autorisé, l'orchestrateur fait produire ou
amender le rapport dans les deux situations suivantes :

- **Archivage OpenSpec autorisé et réussi** : vérifier le rapport dans
  `openspec/changes/archive/<archive>/STATISTICS.md`, après l'archivage effectif
  et les amendements documentaires applicables, avant le nettoyage conditionnel
  du bilan de blocage et les opérations Git prévues par le prompt.
- **Arrêt pour dépendances insatisfaites** : après enregistrement et
  vérification de `BLOCKERS.md`, vérifier le rapport dans
  `openspec/changes/<change>/STATISTICS.md`, avant le gate `BLOQUÉ` et la
  libération. Le change reste ouvert ; indiquer explicitement « change ouvert —
  dépendances manquantes — archivage en attente » et référencer `BLOCKERS.md`.
  La fin de la session peut être datée ; la fin du change et son archivage
  restent en attente, sans réussite globale ni livraison indues.

L'invocation autorisée d'une session pilotée couvre cette écriture limitée
au change déjà autorisé et les amendements ultérieurs de ce même rapport.
Elle n'autorise aucun autre change ni archivage supplémentaire. Sans dossier
de change autorisé, conserver le bilan dans les seules sorties déjà autorisées
et signaler la limite, sans créer un change pour le seul rapport.
Un diagnostic ou une préparation sans archivage n'acquiert aucune obligation
de rapport d'archive. Pour une revalidation d'archive explicitement autorisée,
amender le rapport identifié dans son emplacement existant, en préservant
l'historique ; seulement en son absence, créer `STATISTICS.md` dans l'archive
ciblée. Dater les résultats du RUN de revalidation séparément de la production
historique, sans doublon, réouverture ni réarchivage.

### Collecte, édition et contrôles

Pour une phase devant produire ou amender un rapport, après le feu vert et
les préconditions du profil, avant le premier mandat, l'orchestrateur active
la collecte selon le skill `coding-session-statistics`
disponible et le profil technique applicable. Identifier les historiques
persistants autorisés et les agents réellement intervenus. Appliquer les
relevés initiaux, périodiques et finaux du profil ; aucune collecte n'autorise
la lecture d'une source exclue ou d'un secret. Une relève manquée, une mesure
absente ou non comparable reste `N/A` motivé, sans reconstruction ni estimation.
Un arrêt pour dépendances manquantes utilise les relevés de fin de cette
session ; il ne les présente pas comme des relevés après archivage.

L'agent de codage présente le chemin, les ajouts proposés et leurs preuves.
L'orchestrateur les valide puis confie l'édition de ce seul fichier à l'agent
de codage sous mandat unitaire distinct de ceux de `BLOCKERS.md`, de `tasks.md`
et de l'archivage, avec les accès et permissions du profil. Il vérifie ensuite
le fichier par relecture et le référence dans le checkpoint existant.

Chaque rapport couvre uniquement le change auquel il est rattaché. Appliquer
le contrat réel du skill, avec les tableaux des agents de codage et
d'orchestration puis exactement six sections de niveau 2 : statistiques
générales et décisions ; types de messages et d'outils ; fichiers modifiés ;
commandes ; accès web ; synthèse globale. Vérifier les totaux croisés, les
pourcentages, les unités et la distinction entre approbation, refus et erreur
technique. Préserver la confidentialité, UTF-8 et les fins de ligne LF.
Avant l'édition, retirer ou anonymiser les données sensibles, paramètres d'URL
secrets et contenus bruts inutiles ; cette revue de confidentialité prime sur
le détail des mesures sans effacer les constats factuels utiles.
Le nom des rapports créés est exclusivement `STATISTICS.md`, même si un skill
ou une copie de cadrage emploie une autre convention. L'amendement du rapport
existant d'une revalidation conserve l'emplacement identifié ci-dessus.

### Continuité et échec du rapport

À la reprise effective du change sélectionné, relire `BLOCKERS.md` et le rapport
existant, puis amender ses sections par entrées datées identifiant les sessions
ou RUN et leurs preuves. Conserver les constats, mesures et conclusions
historiques ; distinguer les incréments de session des cumuls du change et
dédupliquer les événements. Ne pas additionner les pourcentages ou quotas de
fenêtres différentes ; signaler les comparaisons impossibles. Une simple
lecture d'un candidat non retenu n'autorise aucun amendement de ses rapports.

Après archivage ultérieur autorisé et réussi, conserver ce même rapport dans
l'archive et l'amender avec les résultats finaux et les preuves réellement
disponibles. Ne pas recréer le rapport ni effacer les entrées des sessions
précédentes. Lors du nettoyage autorisé du bilan de blocage, actualiser son
lien courant vers `BLOCKERS.md` en conservant la trace historique du blocage
et de sa résolution, sans lien caduc. Un rapport de blocage ne prouve aucun
archivage.

Un échec de création, d'amendement ou de vérification fait reprendre uniquement
ce rapport, sans réarchiver ni rejouer des travaux déjà prouvés. Conserver les
sessions encore nécessaires à sa correction. Ne déclarer ni rapport conforme,
ni clôture réussie, ni nettoyage achevé sans preuve ; restituer l'échec et les
conditions de reprise. Un `N/A` motivé n'est pas un échec de génération.

## Nettoyage final des sessions de l'agent de codage

Après validation de tous les rapports attendus pour la phase concernée,
l'orchestrateur supprime toutes les sessions de l'agent de codage qui ont
servi à cette phase ou à ses statistiques : réalisation, sous-jobs,
récupérations successives, sondes et génération ou correction des rapports.
Cette règle s'applique après archivage comme après arrêt pour dépendances
insatisfaites, ainsi qu'aux rapports de revalidation autorisés, avec l'exception
suivante pour un arrêt prématuré pour dépendances insatisfaites.

Dans ce seul cas, conserver la dernière session métier courante de l'agent de
codage pour permettre une reprise ultérieure du change. L'identifier par
l'identifiant natif rattaché au job de codage au moment de l'arrêt, après toute
récupération validée ; ne pas choisir une session de sonde ou de génération
des statistiques au seul motif qu'elle est plus récente. Exclure explicitement
cette session du nettoyage et consigner son identifiant, le change, le RUN,
le dernier jalon prouvé et le motif « conservée pour reprise — dépendances
insatisfaites » dans le checkpoint et le bilan de restitution. Après validation
des statistiques, supprimer les autres sessions ayant servi à cette phase ou
à ses rapports, selon les contrôles ci-dessous. La conservation de cette seule
session métier n'est pas un échec de nettoyage et n'entretient aucune attente,
surveillance ni relance automatique des dépendances. Le job reste clôturé et
désarmé, les ressources libérées et le change ouvert avec le statut `BLOQUÉ`.

L'invocation autorisée du processus couvre ce nettoyage ciblé. Dès leur
création ou reprise, conserver dans le checkpoint autorisé l'inventaire des
identifiants natifs, leur racine, leur RUN, leur fonction et les rapports
auxquels ils contribuent ; un titre ou préfixe seul ne prouve pas la propriété.
Avant toute suppression :

1. Vérifier par relecture les rapports durables, leurs entrées par session et
   les preuves nécessaires à la reprise. Ces éléments doivent rester utilisables
   après suppression des sessions, dans les rapports et checkpoints déjà
   autorisés, sans copie brute d'historique ni nouveau fichier implicite.
2. Traiter les derniers comptes rendus, réconcilier les effets et permissions,
   terminer les mandats et les éventuelles opérations Git autorisées, puis
   vérifier le gate, le désarmement et la libération propres à la phase. Pour
   un change bloqué, conserver `BLOQUÉ` et `delivered=false`. Arrêter les sondes
   et le suivi propres à cette phase sans arrêter les autres RUN.
3. Revérifier que chaque session inventoriée est inactive, ne porte plus de
   mandat, permission ou effet non résolu et n'est plus utilisée par un autre
   travail. Une session contribuant à plusieurs rapports attend leur validation
   à tous. Une pause, un compactage, une interruption récupérable ou la seule
   fin d'un mandat ne déclenche jamais ce nettoyage.

Utiliser uniquement les interfaces natives de suppression exposées par le
profil, depuis l'orchestrateur ; supprimer les sessions natives dans l'agent
de codage, pas seulement leurs références dans le checkpoint. L'agent de
codage ne supprime pas sa propre session. Vérifier la portée des suppressions en cascade et les liens entre
sessions avant d'agir, puis supprimer les sessions enfants admissibles avant
leurs parents. Ne supprimer aucun parent si l'opération emporte la session
conservée pour reprise ; signaler toute suppression ainsi empêchée sans
contourner les protections natives. Vérifier ensuite par une lecture native
l'absence des sessions à supprimer et, le cas échéant, la présence de la session
conservée. Tracer dans le checkpoint les identifiants, résultats, échecs et
sessions restantes.
Une interface absente, une propriété incertaine ou un effet inconnu suspend
la suppression concernée et est signalé sans inventer de réussite.

Conserver le chat et le checkpoint de l'orchestrateur, les rapports,
`BLOCKERS.md` encore utile, les travaux, les preuves et les historiques
d'audit CAB. Préserver les sessions d'autres travaux et les services partagés.
Lors d'un arrêt pour dépendances insatisfaites, préserver aussi la dernière
session métier désignée ci-dessus et son historique natif ; aucun arrêt de
service ou de conteneur ne doit entraîner leur perte.
Ce nettoyage ne permet ni purge globale ni effacement manuel d'un stockage
interne. La conservation des historiques pendant une récupération reste
obligatoire jusqu'à cette clôture prouvée.

La suppression vérifiée est la dernière opération sur les sessions de cette
phase, avant restitution finale ou ouverture d'une nouvelle session de codage,
et avant l'arrêt éventuel du service ou conteneur qui expose leur interface.
Dans un cycle, le parent conserve son identité et son checkpoint ; le change
suivant utilise une nouvelle session de codage après réconciliation. Une
reprise explicitement demandée du change bloqué peut réutiliser la session
métier conservée après réconciliation et vérification des dépendances et des
preuves, selon les possibilités du profil, sans réactiver un job clôturé ni
rejouer une permission consommée. Une nouvelle sélection visant un autre
change ne réutilise pas cette session. Les résultats du nettoyage distinguent
la session conservée pour reprise des sessions supprimées ou en échec ; ils
sont ajoutés au checkpoint et au bilan de restitution, sans régénérer les
statistiques pour mesurer leur propre
nettoyage. En cas d'échec, conserver les suppressions déjà prouvées et reprendre
uniquement celles restantes ; ne pas réarchiver, recréer les sessions supprimées
ou annoncer un nettoyage complet, ni ouvrir la session suivante avant résolution.

# Profil technique OpenCode, CAB et PLLM

Le profil technique actuellement décrit utilise OpenCode comme agent de codage,
l'agent orchestrateur désigné par le prompt et CAB comme transport neutre.
Le nom `CGPT` désigne le rôle d'orchestrateur dans les messages et interfaces
ci-dessous. Un autre agent de codage ou transport exige un contrat d'intégration
explicitement validé ; les exemples CAB ne prouvent pas sa compatibilité et
ne déclenchent aucune adaptation implicite.

Une session directe SCM reste régie par son prompt et AGENTS.md. La présence
de ce fichier ne lance ni agent OpenCode, ni service CAB, ni compétence,
sonde ou télémétrie de session pilotée. Le rapport d'archivage éventuellement
requis par le projet reste une obligation distincte.
