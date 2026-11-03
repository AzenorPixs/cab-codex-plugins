# Clôture — CAB 2.2.18

## Clôture et bilan documentaire

L'orchestrateur vérifie les critères, les tâches, les tests et les rapports
applicables à la finalité métier du prompt avant une clôture normale.
Une clôture pour dépendances manquantes relève de la clôture différée : le
bilan est enregistré dans `BLOCKERS.md` et référencé depuis `tasks.md` et le
checkpoint lorsqu'ils existent, avec preuve de relecture. Il distingue les
tâches prouvées et les contrôles empêchés, sans exiger de
réussite globale ni d'archive du change incomplet. Le gate est BLOQUÉ et les
ressources du seul RUN sont libérées après désarmement et réconciliation.
Les rapports attendus, dans le change ouvert ou l'archive selon le cas,
sont vérifiés selon « Statistiques des sessions pilotées » avant le gate.
Après désarmement et libération réconciliés, appliquer « Nettoyage final des
sessions de l'agent de codage » avant restitution ou session suivante.

Pour un diagnostic ou une préparation sans écriture métier nécessaire, le
job et son gate portent sur les preuves d'analyse et de restitution. Ne pas
inventer une publication de changes ni attribuer `delivered=true` sans preuve
compatible avec la finalité réelle. Si aucune réservation de change ou aucun
job d'écriture n'est requis, réconcilier et libérer seulement les ressources
effectivement acquises et justifier les étapes non applicables. Un contrat
installé incapable de représenter cette clôture doit être signalé, sans faux
change ni réussite technique fabriquée. Les seules écritures de rapport ou de
checkpoint ne deviennent pas une livraison fonctionnelle.

Le gate local est demandé par `POST /runs/<run_id>/job/terminal-gate` avec un état explicite
TERMINÉ ou BLOQUÉ. Un refus laisse le job ouvert avec sa cause. Un gate validé
permet le désarmement du seul job correspondant. Seulement après libération,
nettoyage des sessions concernées et quiescence de tous les RUN, il permet
l'arrêt autorisé du superviseur avant le contrôleur. Le broker reste géré
par OpenCode.

Le compte rendu distingue résultat livré, préparation, attente, refus,
erreur et blocage. Il indique les opérations réellement exécutées, les
limites de preuve, les fichiers touchés et le premier jalon restant.
Une fin de tour, un délai, une réponse textuelle ou une relance technique
ne remplace jamais un état terminal prouvé.

## Clôture ciblée et dépendances manquantes

Après gate individuel, désarmement et réconciliation, POST /runs/<runId>/release
porte version, delivered et evidence. delivered=true exige gate TERMINÉ,
livraison et rapport prouvés. La clôture différée pour dépendances manquantes
exige gate BLOQUÉ, bilan et statistiques durables vérifiés, désarmement et
effets réconciliés ; libérer avec delivered=false sans archiver le change
incomplet. Un sous-job rend le
contrôle au parent ; aucune libération ciblée n'arrête l'infrastructure commune.
