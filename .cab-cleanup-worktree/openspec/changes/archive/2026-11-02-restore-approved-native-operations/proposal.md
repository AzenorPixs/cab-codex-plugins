# Restaurer sûrement les opérations natives approuvées

Code de lot : non attribué.

## Problème

Après redémarrage, le registre peut conserver une opération `PREPARED` tandis
que le contexte contrôleur a perdu la validation et sa décision. Le GET par RUN
montre alors `native=null` et `access=null`, alors qu’une permission native
corrélée est encore pendante. Cette divergence ne permet ni de reprendre
l’opération ni d’établir sa frontière d’effet. Une permission indéterminée peut
aussi empêcher des travaux indépendants.

## Objectif

Persister la décision avec l’identité exacte de l’opération et reconstruire
le contexte uniquement depuis des preuves natives terminées et corrélées.
Après redémarrage, reprendre le même `once` uniquement si OpenCode prouve que
la même permission est toujours pendante et qu’aucune réponse ou exécution
n’a commencé. Si la frontière reste inconnue, conserver la protection des
seules ressources concernées et ne jamais rejouer la réponse. Les opérations
sans recouvrement continuent selon les règles normales d’acquisition.

## Critères d’acceptation

1. Une décision terminale et son identité d’opération sont durablement
   enregistrées avant toute tentative de réponse native.
2. La restauration exige l’approbation native terminée exacte, l’identité du
   RUN, de la session, de la demande, du mandat, du contenu et des révisions.
   Le texte libre et les données incomplètes ne restaurent rien.
3. Le même `once` n’est repris que si le permissionId et le callID exacts sont
   encore pendants et que l’historique ne montre ni réponse ni démarrage.
   Une preuve absente, contradictoire ou inconnue interdit le rejeu.
4. Une fin native corrélée ferme uniquement l’opération et l’accès associés.
   Une opération sans frontière sûre reste `UNKNOWN` et protégée.
5. Un effet inconnu sur une ressource n’impose aucun gel global ; un RUN
   indépendant peut acquérir des ressources non recouvrantes, tandis qu’un
   conflit d’écriture attend.
6. Des tests de crash, réponse perdue, permission persistante, corrélation
   divergente, résultat terminal, absence de résultat et isolation des
   ressources valident ces gardes.
7. La version commune CAB/CABU passe à 2.1.63 ; documentation, archivage,
   statistiques et distribution restent alignés.

## Hors périmètre

Aucune décision automatique, nouvelle demande de validation, permission
supplémentaire, réponse à une permission dont la frontière reste inconnue,
rejeu d’un `once` acquitté, relâchement d’un accès d’effet inconnu, gel global,
arrêt ou redémarrage d’OpenCode, changement d’un RUN externe ou exposition de
chemin, commande, contenu ou bearer token dans l’interface de lecture.
