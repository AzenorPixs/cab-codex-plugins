# Noyau du contrat — CAB 2.4.11

Dans le change validé, le codeur lit, explore et utilise ses outils de façon
autonome. Son atelier propre `.cab-tests/<change>/<RUN>/` autorise aussi les
écritures et copies du projet sans décision supplémentaire. Toute écriture
projet hors atelier et tout accès web exigent la validation préalable de
l’orchestrateur ; tous les résultats de tests lui sont soumis avant de devenir
des preuves acceptées. Hors change ou pour une nouvelle allocation de ressources,
le développeur reste l’autorité. Les ateliers des pairs sont protégés.
Lire [le contrat d’autonomie](autonomy-and-ateliers.md) pour les frontières,
les lanceurs isolés et les réponses perdues. Après reprise ou mise à jour,
chaque acteur recharge le contrat applicable et trace sa version et son rôle.
SGS collecte les sources natives disponibles ; CCAB reçoit les incidents.

Dans le change déjà validé, l’orchestrateur décide et valide les reprises ; le
développeur est sollicité uniquement pour une décision hors de ce périmètre.
Une preuve technique manquante reste à diagnostiquer. Voir les voies qualifiées
et leurs reçus dans [autonomous-recovery](autonomous-recovery.md).


## Champ d'application et autorité

Le protocole CAB est distribué avec le plugin et résolu par AGENTS.md.
Le présent noyau est obligatoire pour le pilotage ; charger ensuite les seules
références nécessaires via protocol-index.md. L'orchestrateur transmet à l'agent
de codage les obligations de son mandat avant exécution. Aucun fichier local
ORCHESTRATED_CODING.md n'est requis pour CAB. La lecture seule du contrat ne
lance aucun service, RUN, évaluation ou maintenance. Les règles générales
AGENTS.md ont pour référentiel le projet template ; le contrat CAB appartient
au projet cab. Leurs propagations sont distinctes et explicitement autorisées.

L'orchestrateur définit le périmètre et les critères, arbitre les demandes et
vérifie les preuves. L'agent de codage analyse et exécute seulement les
opérations autorisées. Le développeur conserve le contrôle des décisions qui
lui sont réservées. Aucun de ces rôles ne peut inventer une autorisation.

Lorsque la demande ou le prompt l’autorise, l’agent orchestrateur réalise
lui-même le commit dans le dépôt Git local et les publications vers les
dépôts distants configurés, sans délégation à l’agent de codage. Il vérifie
et rapporte séparément les résultats locaux et distants ; les autorisations
propres aux opérations Git restent requises. L’agent de codage fournit les
fichiers et preuves attendus, sans exécuter ces opérations. Elles ne constituent
pas une propagation
vers les projets consommateurs, qui exige une autorisation distincte.

## Répartition entre prompts et protocole

Les prompts de session pilotée définissent le travail demandé, son périmètre,
ses livrables, ses autorisations métier, ses validations et ses conditions
terminales. Le présent protocole définit exclusivement les solutions de
pilotage et de sélection des modèles, leurs préconditions, leurs interfaces,
leurs autorisations techniques et leurs procédures de récupération. Ces
règles techniques ne sont pas dupliquées dans les prompts ni dans leur index.

Avant tout pilotage, vérifier le profil et les versions réellement disponibles.
Une référence absente se diagnostique via la distribution ; elle ne justifie
ni création d'une copie locale ni lecture de toutes les branches. Un défaut
localisé suspend les seules actions qui en dépendent. Les références complètent
AGENTS.md, OpenSpec validé et les permissions de la plateforme sans les étendre.

Les prompts restent indépendants des fournisseurs, des modèles et des
solutions de transport ou d'approbation. Ils conservent les décisions réservées
au développeur et leurs limites métier. Un autre profil technique exige un
contrat d'intégration explicitement validé et ses preuves de compatibilité ;
la seule présence d'un outil ne rend pas ce profil disponible.

## Choisir la voie et conserver les rôles

La [grille de décision](pilot-state-matrix.md) relie états, preuves et voies
existantes ; le [parcours de soumission](validation-submission.md) traite
l’unité ordinaire. L’orchestrateur demande l’acquisition partagée au contrôleur
après APPROVED ; seul le contrôleur applique les gardes, persiste l’accès et
émet once. L’automatisme est limité à l’admission exclusive prouvée.
Les outils natifs edit et write partagent la catégorie de permission edit,
mais conservent leurs schémas et empreintes distincts. Un retrait après rejet
ne rend jamais un input divergent exécutable ; suivre la référence du cas.
Le compteur de permissions non appariées n’est pas le total des permissions
natives, et une projection omettant un champ ne prouve pas son absence durable.

## Contrat commun de session

L'orchestrateur vérifie l'identité du projet, le mandat, les préconditions
et les autorisations applicables avant les opérations concernées. Il conserve
les décisions, les preuves, les ressources détenues et le premier jalon non
prouvé dans le seul checkpoint autorisé par le prompt. Une reprise réconcilie
l'état réel avant toute nouvelle opération ; elle ne rejoue aucune permission
consommée et ne redemande pas un accord toujours applicable et non révoqué.

Le développeur fixe les objectifs et conserve les arbitrages qui lui sont
réservés. L'orchestrateur examine les demandes et les preuves ; l'agent de
codage réalise les seuls mandats autorisés. Le transport ne décide jamais.
Une permission technique ne constitue ni une validation métier ni une extension
du périmètre. La concurrence protège les effets et les ressources concernés,
sans imposer de gel global aux travaux indépendants.

### Autorité sur les politiques de permission de l'agent de codage

Pour un RUN associé à un change OpenSpec actif et autorisé, l'orchestrateur
peut consulter, créer, modifier ou retirer les règles natives `ALLOW`, `ASK`
et `DENY` de l'agent de codage, sans validation ponctuelle supplémentaire,
à toute portée exposée par l'agent : session, agent, projet ou espace de
travail, utilisateur ou globale. Cette autorité s'applique uniquement aux
changements nécessaires à la réalisation du change en cours et directement
cohérents avec son périmètre OpenSpec validé et les autorisations du prompt.

Avant toute modification, l'orchestrateur identifie la règle effective, sa
portée, les opérations et ressources touchées ainsi que les effets possibles
hors du RUN. Il applique le changement minimal permettant le travail autorisé.
À une portée partagée, la règle doit rester bornée aux opérations et ressources
du change ; si ses effets ne peuvent être ainsi bornés ou vérifiés, ne pas la
modifier et signaler le blocage. L'orchestrateur consigne la règle précédente,
la règle résultante, sa portée et sa justification dans le checkpoint déjà
autorisé. Les changements temporaires sont restaurés à la clôture du RUN ; une
modification persistante n'est conservée que si elle constitue elle-même un
livrable explicitement prévu par le change OpenSpec.

Cette autorité ne permet ni d'élargir le mandat métier, ni de contourner une
restriction explicite du développeur, une spécification OpenSpec validée, une
permission de plateforme ou les décisions unitaires et contrôles CAB exigés
par le protocole. Une politique `ALLOW` ne vaut pas approbation CAB, validation
métier ou autorisation d'une opération hors périmètre.

Une opération échouée ou interrompue doit être réconciliée avant reprise.
Les états d'attente, de blocage, de préparation et de livraison sont distincts.
Une fin de tour, une absence d'événement ou un délai ne prouve ni la fin des
travaux ni une libération de ressource. Une clôture exige les critères du
prompt et les preuves techniques du profil, sans inventer de résultat.

## Absence de limite temporelle de session

Le protocole ne fixe aucune durée maximale de session ou de mandat. Le temps
écoulé, une absence de sortie ou un délai d'attente technique ne déclenche,
à lui seul, ni arrêt, ni suspension, ni gel, ni clôture partielle du RUN.
Contrôler l'état réel et les preuves pour qualifier une anomalie ; poursuivre
le travail autorisé lorsqu'aucun blocage prouvé ne l'empêche.

Les protections liées à des effets inconnus, aux permissions ou aux ressources
détenues restent applicables jusqu'à réconciliation. Un délai ne les lève pas
et ne vaut jamais autorisation de rejouer une opération. La fraîcheur PLLM au
seul démarrage initial, les cadences de suivi, les sondes et le compactage
restent distincts d'une limite d'exécution de la session.

## Finalité du contrat et critères techniques de clôture

| Finalité du prompt | Résultat métier attendu | Limites du contrat technique |
|---|---|---|
| Diagnostic ou audit | Analyse et restitution, avec constats et décisions éventuellement en attente | Pas d'écriture métier ; seul le checkpoint déjà autorisé fait exception. Aucun test applicatif, correction, archivage ou rapport d'archive imposé pour obtenir le gate. |
| Préparation, notamment GSCMP | Couverture démontrée et seuls changes ou compléments nécessaires préparés | Zéro création et aucune écriture OpenSpec sont possibles. Les tests de communication ne valent pas tests applicatifs. Aucune implémentation ni archivage requis. |
| Implémentation | Réalisation et validations du périmètre autorisé | Les obligations de cohérence, de rapports et d'archivage éligible restent celles du prompt. Un change incomplet reste ouvert lors d'une clôture pour dépendances manquantes. |
| Revalidation d'archive | Contrôles et rapports explicitement autorisés sur la cible résolue | Aucune réouverture, correction ou nouvelle livraison fonctionnelle déduite de l'audit. Préserver les preuves historiques. |

Les nouvelles tâches de développement préparées restent non cochées. Les
critères du job représentent le travail réel de la session, pas des tâches
futures ni des tâches historiques à réaliser artificiellement. Le contrat
technique doit représenter la finalité demandée ; une incompatibilité démontrée
est rapportée sans création de change fictif, modification interdite ou faux gate.
Les restrictions d'un audit ciblé priment sur les clauses génériques de tests,
d'intégration, d'archivage ou de fin globale du projet.

Un appel technique terminé ne prouve pas sa récupération réussie : lire le
résultat structuré et l’état autoritaire ; un échec de livraison reste un échec.

Ressources déclarées dans DEVOPS.md : appliquer la référence
[devops-resources](devops-resources.md) du skill CAB installé
(`devops-resources.md` depuis les références). Outils locaux RO et catalogue
actualisé ; accès externes par voies CAB, sans secrets ni socket de contrôle.

Tests : atelier prioritaire ; le codeur justifie à l’orchestrateur tout critère
non réalisable qui nécessite LXC/Docker. L’orchestrateur tranche ; le codeur
ne bascule pas seul. Voir autonomie et ateliers.

Les dépendances relèvent du [référentiel OpenSpec](dependency-authority.md), pas de l’historique d’exécution CAB. Le nettoyage ne recrée pas d’anciens RUN pour justifier un change achevé.

Le différentiel de préservation inclut les clés des objets protégés ; [réparer sur copies exactes](preservation-repair.md) avant toute restitution de succès.
