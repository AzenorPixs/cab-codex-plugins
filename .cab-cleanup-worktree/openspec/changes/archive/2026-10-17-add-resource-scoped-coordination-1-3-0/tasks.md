# Tâches CAB 1.3.0

Statut : périmètre SCM validé par le développeur le 16 octobre 2026. Les cases sont cochées uniquement après preuve de réalisation.

## 1. Validation et base de réalisation

- [x] 1.1 Obtenir la validation explicite du contrat et du périmètre SCM ; preuve : accord du développeur référencé dans le dossier.
- [x] 1.2 Recouper l’état du change statistiques initialement 1.2.2 et obtenir la décision distincte ; preuve : extension validée intégrant ses fonctions et sa clôture dans le jeu 1.3.0.
- [x] 1.3 Inventorier les versions, imports, tests et documents concernés ; preuve : matrice exhaustive des briques comparée à la section distribution de design.md.

## 2. Registre, accès et persistance

- [x] 2.1 Séparer réservation du change, périmètre et accès actifs ; vérifier admission de périmètres communs et maintien de l'exclusivité change/intention.
- [x] 2.2 Implémenter l'acquisition durable de l'ensemble complet ; vérifier concurrence réelle, absence d'attribution partielle et reçus répétés/divergents.
- [x] 2.3 Implémenter lectures compatibles et FIFO entre conflits ; vérifier écrivain non affamé et progression d'une demande indépendante.
- [x] 2.4 Implémenter exclusivité prouvée et promotion ciblée ; vérifier arrivée d'un pair pendant écriture privée et lecture du répertoire parent.
- [x] 2.5 Couvrir identités canoniques, aliases physiques, parents et sous-arbres ; vérifier liens matériels, création, déplacement et refus d'extension bloquante pendant détention.
- [x] 2.6 Persister opérations, protections, révisions et fins ; vérifier crash aux frontières, erreur de persistance, fin inconnue et absence de libération sur timeout.
- [x] 2.7 Documenter registre schéma 4, schémas broker et API d'accès dans TECHNICAL.md ; vérifier cohérence avec les tests et formats réellement retenus.

## 3. Broker, décisions et permission native

- [x] 3.1 Transporter et persister les champs d'opération dans broker, routeur et décisions ; vérifier limites, types, corrélation et restauration historique.
- [x] 3.2 Acquérir après préparation/décision avant effet et recontrôler avant once ; vérifier attente humaine sans verrou d'écriture inutile et refus d'une base périmée.
- [x] 3.3 Conserver les mandats unitaires dans un groupe protégé ; vérifier deux éditions distinctes, deux décisions et deux permissions once sans élargissement.
- [x] 3.4 Corréler les fins natives et protéger les effets incertains ; vérifier rupture SSE, idle trompeur, refus sans effet et échec avec effets partiels.
- [x] 3.5 Étendre les gardes du gate aux protections non résolues ; vérifier qu'une archive ou un rapport seuls ne clôturent pas un RUN incertain.
- [x] 3.6 Mettre à jour exemples et règles d'opération dans le protocole local et la référence distribuée ; vérifier conformité aux scénarios native ask/once.

## 4. Validations et publications ciblées

- [x] 4.1 Suivre révisions de ressources, sous-arbres et dépendances des preuves ; vérifier invalidation ciblée, création dans un sous-arbre et publication indépendante.
- [x] 4.2 Ajouter publication ciblée et reçu atomique vers REPORT ; vérifier répétition après crash, contenu divergent, anciennes générations et preuves périmées.
- [x] 4.3 Remplacer les gardes de cohorte ordinaires par celles de la portée ; vérifier B occupé indépendant pendant validation et publication de A.
- [x] 4.4 Adapter synchronisation/archivage et rapport à leurs ressources ; vérifier validation OpenSpec avec écriture de code indépendante et rapport propre au change.
- [x] 4.5 Documenter la préparation, la réacquisition et les preuves dans PROJECT.md, TECHNICAL.md et README.md ; vérifier l'absence de barrière ordinaire résiduelle contradictoire.

## 5. Exceptions, supervision et diagnostic

- [x] 5.1 Ajouter les quatre causes globales et leur drainage durable ; vérifier maintenance, réconciliation commune, pause/arrêt globaux, admission fermée et preuves de quiescence.
- [x] 5.2 Maintenir pause/arrêt et incertitudes de portée connue au RUN ou aux ressources concernés ; vérifier activité indépendante et absence de libération d'un effet inconnu.
- [x] 5.3 Adapter superviseur, client SSE et healthcheck ; vérifier attente légitime sans relance métier, pause prioritaire et absence de remédiation globale automatique.
- [x] 5.4 Exposer conflits, promotions, propriétaires et causes exceptionnelles dans les vues de statut ; vérifier attente actuelle, observation périmée et sources indisponibles.
- [x] 5.5 Adapter l'outil de purge aux nouveaux formats ; vérifier refus des réservations et acquisitions actives, liens et registres invalides.
- [x] 5.6 Documenter pause/arrêt ciblés et globaux dans commande, skill et références ; vérifier syntaxe explicite et maintien des autorités/gates existants.

## 6. Statistiques et distribution

- [x] 6.1 Mesurer attente, détention, promotion, réconciliation ciblée et gel exceptionnel ; vérifier chevauchements, bornes, couverture et absence de chemins ou contenus sensibles.
- [x] 6.2 Implémenter et intégrer les fonctions statistiques du change integrate-observation-statistics selon l'extension validée ; vérifier fenêtres, imports et consultations sans double compte ; clôture distincte dans le suivi ci-dessous.
- [x] 6.3 Aligner toutes les versions de projet à 1.3.0 avec cachebuster neuf et supports complets ; vérifier inventaire, manifeste, imports, commande, unités et pyproject.toml.
- [x] 6.4 Ajouter négociation de capacité et refus des anciennes mutations incompatibles ; vérifier jeu mixte, ancien broker et absence de gel ordinaire par ancienne route.
- [x] 6.5 Mettre à jour skills, références, générateur et commande dans CAB ; vérifier empreintes des prompts directs et absence de propagation interprojets.
- [x] 6.6 Documenter maintenance, migration et retour arrière dans BUILD.md ; vérifier scénarios hors ligne conservant RUN, effets, décisions et reçus.
- [x] 6.7 Mettre à jour CHANGELOG.md et revoir la matrice documentaire ; preuve : état par document avec sections modifiées ou justification d'absence de changement.

## 7. Qualification intégrée

- [x] 7.1 Exécuter les contrôles de syntaxe Python/Node configurés ; conserver commandes, résultats et indisponibilités réels.
- [x] 7.2 Exécuter tests Python applicables et suites Node isolées ; vérifier absence d'affaiblissement des gardes et régressions native once, reprise, persistance et statistiques.
- [x] 7.3 Qualifier trois RUN simulés avec conflits, publications, rapports et pause/arrêt ; vérifier progression indépendante et exclusions uniquement exceptionnelles.
- [x] 7.4 Vérifier migration et retour arrière sur états synthétiques ; prouver préservation des opérations consommées et refus d'une restauration perdant des effets récents.
- [x] 7.5 Exécuter OpenSpec strict ciblé et global avant archive ; conserver exit natif et warnings exacts, puis revoir conformité et périmètre, avec l’écart des anciennes fixtures explicitement signalé. Le contrôle après synchronisation/archivage reste dans le suivi ci-dessous.

## Workflow follow-up

- Après validation du périmètre SCM et réussite de tous les critères, synchroniser puis archiver add-resource-scoped-coordination-1-3-0 et integrate-observation-statistics, chacun après sa qualification et avec son rapport distinct.
- Produire son STATISTIQUES.md d'archive avec six sections, mesures réellement disponibles et N/A motivés, sans skill de statistiques pilotées en SCM.
- Vérifier UTF-8/LF, cohérence des totaux, matrice documentaire et OpenSpec global strict après archivage ; ne déclarer TERMINÉ qu'après ces preuves.
- Le déploiement, la migration d'un runtime actif, la propagation vers les projets consommateurs et les opérations Git restent soumis à une autorisation distincte.

Preuves : VALIDATIONS-SCM.json, INVENTAIRE-SCM.json, MATRICE-DOCUMENTAIRE.md et qualification hors ligne output/scm/cab-1-3-0/qualification-observations.json. Les tâches qualifient les sources ; les étapes d’archivage sont prouvées séparément après exécution.
